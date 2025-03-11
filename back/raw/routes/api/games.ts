import { FastifyInstance } from "fastify";
import { checkAuth } from "../api/auth.js";
import { WebSocket as WSWebSocket } from 'ws';
import { GameSettings } from "../games/gameFormats.js";
import { startGame, runningGames } from "../games/games.js";

export async function gameRoutes(app: FastifyInstance) {
	app.post("/api/games/start", { preValidation: [app.authenticate] }, async (request, reply) => {
		const user = await checkAuth(request);
		if (!user) {
			return reply.code(401).send({ error: "Unauthorized" });
		}

		const gameSettings = request.body;
		console.log("Starting game with settings:", gameSettings);

		try {
			await startGame(user, gameSettings as GameSettings);
			return reply.code(200).send({ message: "Game started successfully" });
		} catch (error) {
			if (error instanceof Error) {
				return reply.code(400).send({ error: error.message });
			} else {
				return reply.code(400).send({ error: "Unknown error" });
			}
		}
	});

	app.get('/api/games/join/:gameId/:playerId', { websocket: true }, (socket, req) => {
		const { gameId, playerId } = req.params as { gameId: string; playerId: string };
		const parsedGameId = parseInt(gameId, 10);
		const parsedPlayerId = parseInt(playerId, 10);
	
		const game = runningGames.find(g => g.gameId === parsedGameId);
		if (!game) {
			socket.close(1008, 'Game not found');
			return;
		}
	
		const player = game.players.find(p => p.playerId === parsedPlayerId);
		if (!player) {
			socket.close(1008, 'Player not found');
			return;
		}
	
		player.wsocket = socket as WSWebSocket;
		console.log(`Player ${parsedPlayerId} connected to game ${parsedGameId}.`);

		socket.on('message', (message: Buffer) => {
			const msgStr = message.toString();
			console.log(`Received message from player ${parsedPlayerId}: ${msgStr}`);
			
			try {
				const data = JSON.parse(msgStr);
				if (data.type === 'chat') {
					const text = data.text;
					for (const p of game.players) {
						if (p.wsocket && p.playerId !== parsedPlayerId) {
							p.wsocket.send(JSON.stringify({ type: 'chat', playerId: parsedPlayerId, text }));
						}
					}
				}
			} catch (err) {
				console.error(`Invalid message format from player ${parsedPlayerId}:`, err);
			}
		});
	
		socket.on('close', () => {
			console.log(`Player ${parsedPlayerId} disconnected from game ${parsedGameId}.`);
			player.wsocket = null;
		});
	});
}
