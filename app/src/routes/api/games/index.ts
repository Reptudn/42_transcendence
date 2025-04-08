import { FastifyPluginAsync } from 'fastify';
import { WebSocket as WSWebSocket } from 'ws';
import {
	startGame,
	runningGames,
} from '../../../services/games/pong/games/games';
import { checkAuth } from '../../../services/auth/auth';

const games: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post(
		'/api/games/start',
		{ preValidation: [fastify.authenticate] },
		async (request, reply) => {
			const user = await checkAuth(request);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}

			const gameSettings = request.body;
			fastify.log.info('Starting game with settings:', gameSettings);

			try {
				await startGame(user, gameSettings as GameSettings);
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
		'/api/games/join/:gameId/:playerId',
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
