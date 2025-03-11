import { FastifyInstance } from "fastify";
import { checkAuth } from "./auth.js";
import { User } from '../../db/database.js';
import { getUserById } from '../../db/db_users.js';
import { connectedClients, sendRawToClient } from "../../sse.js";
import { WebSocket as WSWebSocket } from 'ws';

class Game {
	gameId: number;
	status: GameStatus;
	players: Player[];

	constructor(gameId: number, players: Player[]) {
		this.gameId = gameId;
		this.status = GameStatus.WAITING;
		this.players = players;
	}

	isReady() {
		for (const player of this.players) {
			if (!player.isReady()) {
				return false;
			}
		}
		return true;
	}
}
class Player {
	type: PlayerType;
	playerId: number; // unique within a game, not to be confused with user id system

	// PlayerType.USER
	userId: number | null;
	wsocket: WSWebSocket | null;

	// PlayerType.AI
	aiLevel: number | null;

	// PlayerType.LOCAL
	// for local players, userId saves admin user id
	localPlayerId: number | null;

	constructor(type: PlayerType, playerId: number, userId: number | null = null, wsocket: WSWebSocket | null = null, aiLevel: number | null = null, localPlayerId: number | null = null) {
		this.type = type;
		this.playerId = playerId;
		this.userId = userId;
		this.wsocket = wsocket;
		this.aiLevel = aiLevel;
		this.localPlayerId = localPlayerId;
	}

	isReady() {
		return this.wsocket !== null;
	}
}
enum GameStatus {
	WAITING = "waiting", // awaiting all players to join
	RUNNING = "running"
}
enum PlayerType {
	USER = "user",
	AI = "ai",
	LOCAL = "local"
}

let runningGames: Game[] = [];
let nextGameId = 0;

export interface GameSettings {
	players: [
		{
			type: PlayerType;
			id: number;
			aiLevel?: number;
			localPlayerId?: number;
		}
	]
}

export async function startGame(admin: User, gameSettings: GameSettings) {
	let gameId = nextGameId++;
	let currPlayerID = 0;

	const readPlayers = gameSettings.players;
	let players: Player[] = [];

	players.push(new Player(PlayerType.USER, currPlayerID++, admin.id));
	sendRawToClient(admin.id, `data: ${JSON.stringify({ type: "game_admin_request", gameId, playerId: currPlayerID })}\n\n`);

	console.log('Sent invite to admin', players);

	for (const readPlayer of readPlayers) {
		let player: Player | null = null;
		if (readPlayer.type === PlayerType.USER) {
			let id: number = readPlayer.id;
			if (id != admin.id) {
				let user = await getUserById(id);
				if (user !== null && connectedClients.has(id)) {
					player = new Player(PlayerType.USER, currPlayerID++, id);
					sendRawToClient(id, `data: ${JSON.stringify({ type: "game_request", gameId, playerId: currPlayerID })}\n\n`);
				} else {
					throw new Error("User not found or not connected");
				}
			} else {
				throw "Game-starting player should not be added as a player";
			}
		} else if (readPlayer.type === PlayerType.AI) {
			let aiLevel = readPlayer.aiLevel;
			player = new Player(PlayerType.AI, currPlayerID++, null, null, aiLevel);
		} else if (readPlayer.type === PlayerType.LOCAL) {
			player = new Player(PlayerType.LOCAL, currPlayerID++, admin.id, null, null, readPlayer.localPlayerId);
		} else {
			throw "Invalid player type";
		}
		if (player !== null) {
			players.push(player);
		}
	}

	console.log('Game started with players:', players);

	runningGames.push(new Game(gameId, players));
}

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
