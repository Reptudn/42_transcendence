import { FastifyPluginAsync } from 'fastify';
import { WebSocket as WSWebSocket } from 'ws';
import {
	startGame,
	runningGames,
} from '../../../services/games/pong/games/games';
import { checkAuth } from '../../../services/auth/auth';

const startGameSchema = {
	body: {
		type: 'object',
		required: [
			'map',
			'playerLives',
			'gameDifficulty',
			'powerups',
			'players',
		],
		properties: {
			map: {
				type: 'string',
				errorMessage: {
					type: 'Map must be a string.',
				},
			},
			playerLives: {
				type: 'integer',
				minimum: 0,
				errorMessage: {
					type: 'Player lives must be an integer.',
					minimum: 'Player lives cannot be negative.',
				},
			},
			gameDifficulty: {
				type: 'integer',
				minimum: 0,
				errorMessage: {
					type: 'Game difficulty must be an integer.',
					minimum: 'Game difficulty must be at least 0.',
				},
			},
			powerups: {
				type: 'boolean',
				errorMessage: {
					type: 'Powerups must be a boolean value.',
				},
			},
			players: {
				type: 'array',
				errorMessage: {
					type: 'Players must be an array.',
				},
				items: {
					type: 'object',
					required: ['type'],
					properties: {
						type: {
							type: 'string',
							enum: ['user', 'local', 'ai'],
							errorMessage: {
								type: 'Player type must be a string.',
								enum: 'Player type must be one of: user, local, ai.',
							},
						},
						id: {
							type: 'integer',
							errorMessage: {
								type: 'For a user, id must be an integer.',
							},
						},
						controlScheme: {
							type: 'string',
							errorMessage: {
								type: 'For a local player, controlScheme must be a string.',
							},
						},
						aiLevel: {
							type: 'integer',
							minimum: 0,
							maximum: 9,
							errorMessage: {
								type: 'For an AI player, aiLevel must be an integer.',
								minimum: 'AI level cannot be less than 0.',
								maximum: 'AI level cannot exceed 9.',
							},
						},
						aiOrLocalPlayerName: {
							type: 'string',
							errorMessage: {
								type: 'For a local or AI player, aiOrLocalPlayerName must be a string.',
							},
						},
					},
					additionalProperties: false,
					errorMessage: {
						additionalProperties:
							'Player object contains disallowed properties.',
					},
				},
			},
		},
		additionalProperties: false,
		errorMessage: {
			required: {
				map: 'Map is required.',
				playerLives: 'Player lives are required.',
				gameDifficulty: 'Game difficulty is required.',
				powerups: 'Powerups flag is required.',
				players: 'Players array is required.',
			},
			additionalProperties:
				'No additional properties are allowed in game settings.',
		},
	},
};

const games: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post(
		'/start',
		{
			preValidation: [fastify.authenticate],
			schema: startGameSchema,
		},
		async (request, reply) => {
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}

			const gameSettings: GameSettings = request.body as GameSettings;
			fastify.log.info(
				'Game settings: ' +
					JSON.stringify(gameSettings) +
					' parsed from raw data ' +
					JSON.stringify(request.body)
			);

			if (!gameSettings) {
				return reply.code(400).send({ error: 'Missing game settings' });
			}

			fastify.log.info(
				'Starting game with settings:',
				JSON.stringify(gameSettings)
			);

			try {
				await startGame(user, gameSettings as GameSettings, fastify);
				return reply
					.code(200)
					.send({ message: 'Game started successfully' });
			} catch (error) {
				if (error instanceof Error) {
					return reply.code(400).send({ error: error.message });
				}
				return reply.code(400).send({ error: 'Unknown error' });
			}
		}
	);

	fastify.get(
		'/join/:gameId/:playerId',
		{ websocket: true },
		(socket, req) => {
			const { gameId, playerId } = req.params as {
				gameId: string;
				playerId: string;
			};
			const parsedGameId = Number.parseInt(gameId, 10);
			const parsedPlayerId = Number.parseInt(playerId, 10);

			const game = runningGames.find((g) => g.gameId === parsedGameId);
			if (!game) {
				socket.close(1008, 'Game not found');
				return;
			}

			const player = game.players.find(
				(p) => p.playerId === parsedPlayerId
			);
			if (!player) {
				socket.close(1008, 'Player not found');
				return;
			}

			player.wsocket = socket as WSWebSocket;
			fastify.log.info(
				`Player ${parsedPlayerId} connected to game ${parsedGameId}.`
			);

			socket.on('message', (message: Buffer) => {
				const msgStr = message.toString();
				fastify.log.info(
					`Received message from player ${parsedPlayerId}: ${msgStr}`
				);

				try {
					const data = JSON.parse(msgStr);
					if (data.type === 'chat') {
						const text = data.text;
						for (const p of game.players) {
							if (p.wsocket && p.playerId !== parsedPlayerId) {
								p.wsocket.send(
									JSON.stringify({
										type: 'chat',
										playerId: parsedPlayerId,
										text,
									})
								);
							}
						}
					} else if (data.type === 'move') {
						player.movementDirection = data.dir;
						fastify.log.info(
							'Server received movement data:',
							data
						);
					}
				} catch (err) {
					fastify.log.error(
						`Invalid message format from player ${parsedPlayerId}:`,
						err
					);
				}
			});

			socket.on('close', () => {
				fastify.log.info(
					`Player ${parsedPlayerId} disconnected from game ${parsedGameId}.`
				);
				player.wsocket = null;
			});
		}
	);
};

export default games;
