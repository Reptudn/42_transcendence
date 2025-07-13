import { FastifyPluginAsync } from 'fastify';
// import { WebSocket as WSWebSocket } from 'ws';
// import { startGame, runningGames } from '../../../services/pong/games/games';
import { checkAuth } from '../../../services/auth/auth';
import { Game, Player, PlayerType} from '../../../services/pong/games/gameFormats';
import { sendSseRawByUserId } from '../../../services/sse/handler';
import { runningGames } from '../../../services/pong/games/games';
// import { createGameInDB } from '../../../services/database/games';

// const startGameSchema = {
// 	body: {
// 		type: 'object',
// 		required: [
// 			'map',
// 			'playerLives',
// 			'gameDifficulty',
// 			'powerups',
// 			'players',
// 		],
// 		properties: {
// 			map: {
// 				type: 'string',
// 				errorMessage: {
// 					type: 'Map must be a string.',
// 				},
// 			},
// 			playerLives: {
// 				type: 'integer',
// 				minimum: 0,
// 				errorMessage: {
// 					type: 'Player lives must be an integer.',
// 					minimum: 'Player lives cannot be negative.',
// 				},
// 			},
// 			gameDifficulty: {
// 				type: 'integer',
// 				minimum: 0,
// 				errorMessage: {
// 					type: 'Game difficulty must be an integer.',
// 					minimum: 'Game difficulty must be at least 0.',
// 				},
// 			},
// 			powerups: {
// 				type: 'boolean',
// 				errorMessage: {
// 					type: 'Powerups must be a boolean value.',
// 				},
// 			},
// 			players: {
// 				type: 'array',
// 				errorMessage: {
// 					type: 'Players must be an array.',
// 				},
// 				items: {
// 					type: 'object',
// 					required: ['type'],
// 					properties: {
// 						type: {
// 							type: 'string',
// 							enum: ['user', 'local', 'ai'],
// 							errorMessage: {
// 								type: 'Player type must be a string.',
// 								enum: 'Player type must be one of: user, local, ai.',
// 							},
// 						},
// 						id: {
// 							type: 'integer',
// 							errorMessage: {
// 								type: 'For a user, id must be an integer.',
// 							},
// 						},
// 						controlScheme: {
// 							type: 'string',
// 							errorMessage: {
// 								type: 'For a local player, controlScheme must be a string.',
// 							},
// 						},
// 						aiLevel: {
// 							type: 'integer',
// 							minimum: 0,
// 							maximum: 9,
// 							errorMessage: {
// 								type: 'For an AI player, aiLevel must be an integer.',
// 								minimum: 'AI level cannot be less than 0.',
// 								maximum: 'AI level cannot exceed 9.',
// 							},
// 						},
// 						aiOrLocalPlayerName: {
// 							type: 'string',
// 							errorMessage: {
// 								type: 'For a local or AI player, aiOrLocalPlayerName must be a string.',
// 							},
// 						},
// 					},
// 					additionalProperties: false,
// 					errorMessage: {
// 						additionalProperties:
// 							'Player object contains disallowed properties.',
// 					},
// 				},
// 			},
// 		},
// 		additionalProperties: false,
// 		errorMessage: {
// 			required: {
// 				map: 'Map is required.',
// 				playerLives: 'Player lives are required.',
// 				gameDifficulty: 'Game difficulty is required.',
// 				powerups: 'Powerups flag is required.',
// 				players: 'Players array is required.',
// 			},
// 			additionalProperties:
// 				'No additional properties are allowed in game settings.',
// 		},
// 	},
// };

const games: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post(
		'/create',
		{
			preValidation: [fastify.authenticate],
			schema: {},
		},
		async (request, reply) => {
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}
			fastify.log.info(`Creating a new game for user: ${user.username}`);
			try {
				const existingGame = runningGames.find((g) => g.admin.id === user.id);
				if (existingGame) {
					return reply.code(400).send({ error: 'User already has a game' });
				}
				const id: number = runningGames.length + 1; // Temporary ID generation
				fastify.log.info(`Game created with ID: ${id}`);
				runningGames.push({
					gameId: id,
					admin: user
				} as Game);
				const game = runningGames[id];

				// TODO: find a better approach for this
				game.players.splice(0, game.players.length); // Clear players array
				game.players.push(new Player(
					PlayerType.USER,
					0,
					3
				));
				game.players[0].userId = user.id;
				game.players[0].joined = true;
				game.admin = user;

				// ---------

				return reply.code(200).send({
					message: 'Game created successfully',
					gameId: id
				});
			} catch (err) {
				fastify.log.error(`Error creating game: ${err}`);
				return reply.code(500).send({ error: 'Failed to create game' });
			}
		}
	);

	fastify.post('/invite/:userId', {
		preValidation: [fastify.authenticate],
	}, async (request, reply) => {
		const user = await checkAuth(request, false, fastify);
		if (!user) {
			return reply.code(401).send({ error: 'Unauthorized' });
		}
		const { userId } = request.params as { userId: string };
		const parsedUserId = Number.parseInt(userId, 10);
		const game = runningGames.find((g) => g.admin.id === user.id);
		fastify.log.info(`User ${user.username} is inviting user with ID ${parsedUserId} to their game.`);
		if (!game) {
			return reply.code(404).send({ error: 'No game found for the user' });
		}

		fastify.log.info(`Game found: ${game.gameId} for user ${user.username}`);
		// if (game.players.find((p) => p.userId === parsedUserId)) {
		// 	return reply.code(400).send({ error: 'User is already invited to the game' });
		// }

		fastify.log.info(`Sending game invite to user with ID ${parsedUserId} for game ${game.gameId}`);
		// TODO: add the user to the game that they have been invited but not joined

		const id: number | undefined = game ? game.gameId : undefined;

		if (id === undefined) {
			return reply.code(404).send({ error: 'Game not found' });
		}

		sendSseRawByUserId(
			parsedUserId,
			`data: ${JSON.stringify({
				type: 'game_invite',
				gameId: id
			})}\n\n`
		);

		return reply.code(200).send({ message: 'Game invite sent' });
	});

	// fastify.post(
	// 	'/start',
	// 	{
	// 		preValidation: [fastify.authenticate],
	// 		schema: startGameSchema,
	// 	},
	// 	async (request, reply) => {
	// 		const user = await checkAuth(request, false, fastify);
	// 		if (!user) {
	// 			return reply.code(401).send({ error: 'Unauthorized' });
	// 		}

	// 		const gameSettings: GameSettings = request.body as GameSettings;
	// 		fastify.log.info(
	// 			'Game settings: ' +
	// 				JSON.stringify(gameSettings) +
	// 				' parsed from raw data ' +
	// 				JSON.stringify(request.body)
	// 		);

	// 		if (!gameSettings) {
	// 			return reply.code(400).send({ error: 'Missing game settings' });
	// 		}

	// 		fastify.log.info(
	// 			'Starting game with settings:',
	// 			JSON.stringify(gameSettings)
	// 		);

	// 		try {
	// 			await startGame(user, gameSettings as GameSettings, fastify);
	// 			return reply
	// 				.code(200)
	// 				.send({ message: 'Game started successfully' });
	// 		} catch (error) {
	// 			if (error instanceof Error) {
	// 				return reply.code(400).send({ error: error.message });
	// 			}
	// 			return reply.code(400).send({ error: 'Unknown error' });
	// 		}
	// 	}
	// );

	// fastify.get('/join/:gameId', {}, async (request, reply) => {
	// 	const user = await checkAuth(request, false, fastify);
	// 	if (!user) {
	// 		return reply.code(401).send({ error: 'Unauthorized' });
	// 	}
	// 	const { gameId } = request.params as { gameId: string };
	// 	const parsedGameId = Number.parseInt(gameId, 10);

	// 	const game = runningGames.find((g) => g.gameId === parsedGameId);
	// 	if (!game) {
	// 		return reply.code(404).send({ error: 'Game not found' });
	// 	}

	// 	if (game.status !== 'waiting')
	// 		return reply.code(404).send({ error: 'The game you are trying to join has already started!' })

	// 	if (game.players.find((p) => p.userId === user.id)) {
	// 		if (game.players.find((p) => p.userId === user.id)?.joined) {
	// 			return reply.code(400).send({ error: 'You are already in the game!' });
	// 		}
	// 		game.players.find((p) => p.userId === user.id)!.joined = true;
	// 	}

	// 	return reply.code(200).view('game_lobby', {
	// 		gameId: game.gameId,
	// 		gameSettings: game.gameSettings
	// 	});
	// });

	// fastify.get(
	// 	'/join/:gameId/:playerId',
	// 	{ websocket: true },
	// 	(socket, req) => {
	// 		const { gameId, playerId } = req.params as {
	// 			gameId: string;
	// 			playerId: string;
	// 		};
	// 		const parsedGameId = Number.parseInt(gameId, 10);
	// 		const parsedPlayerId = Number.parseInt(playerId, 10);

	// 		const game = runningGames.find((g) => g.gameId === parsedGameId);
	// 		if (!game) {
	// 			socket.close(1008, 'Game not found');
	// 			return;
	// 		}

	// 		const player = game.players.find(
	// 			(p) => p.playerId === parsedPlayerId
	// 		);
	// 		if (!player) {
	// 			socket.close(1008, 'Player not found');
	// 			return;
	// 		}

	// 		player.wsocket = socket as WSWebSocket;
	// 		fastify.log.info(
	// 			`Player ${parsedPlayerId} connected to game ${parsedGameId}.`
	// 		);

	// 		socket.on('message', (message: Buffer) => {
	// 			const msgStr = message.toString();
	// 			fastify.log.info(
	// 				`Received message from player ${parsedPlayerId}: ${msgStr}`
	// 			);

	// 			try {
	// 				const data = JSON.parse(msgStr);
	// 				if (data.type === 'chat') {
	// 					const text = data.text;
	// 					for (const p of game.players) {
	// 						if (p.wsocket && p.playerId !== parsedPlayerId) {
	// 							p.wsocket.send(
	// 								JSON.stringify({
	// 									type: 'chat',
	// 									playerId: parsedPlayerId,
	// 									text,
	// 								})
	// 							);
	// 						}
	// 					}
	// 				} else if (data.type === 'move') {
	// 					player.movementDirection = data.dir;
	// 					fastify.log.info(
	// 						'Server received movement data:',
	// 						data
	// 					);
	// 				}
	// 			} catch (err) {
	// 				fastify.log.error(
	// 					`Invalid message format from player ${parsedPlayerId}:`,
	// 					err
	// 				);
	// 			}
	// 		});

	// 		socket.on('close', () => {
	// 			fastify.log.info(
	// 				`Player ${parsedPlayerId} disconnected from game ${parsedGameId}.`
	// 			);
	// 			player.wsocket = null;
	// 		});
	// 	}
	// );

	// fastify.post('/kick/:userId', {
	// 	preValidation: [fastify.authenticate],
	// }, async (
	// 	request: FastifyRequest,
	// 	reply: FastifyReply
	// ) => {
	// 	const userToKick: User | null = await getUserById(request.params.userId, fastify);
	// 	if (!userToKick)
	// 		return reply.send({ message: `No such player with id ${request.params.userId} found` });
	// 	const user = await checkAuth(request, false, fastify);
	// 	if (!user)
	// 		return reply.send({ message: 'Unauthorized' });

	// 	let userGame: Game | null = null;
	// 	runningGames.forEach(game => {
	// 		if (game.adminId === user.id) {
	// 			userGame = game;
	// 			return;
	// 		}
	// 	});

	// 	if (!userGame)
	// 		return reply.send({ message: `User ${user.id} is not an admin of any game` });

	// 	userGame.players = userGame.players.filter(p => p.id !== userToKick.id);
	// 	fastify.log.info(`Player ${userToKick.username} has been kicked from game ${userGame.id}`);
	// 	return reply.send({ message: `Player ${userToKick.username} has been kicked from the game` });
	// });

	fastify.get(
		'/all',
		{
			preValidation: [fastify.authenticate],
		},
		async (request, reply) => {
			// get all games from the database
		}
	);

	fastify.get(
		'/game/:id',
		{
			preValidation: [fastify.authenticate],
		},
		async (request, reply) => {
			// get all games from the database
		}
	);
};

export default games;
