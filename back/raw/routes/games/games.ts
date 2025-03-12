import { User } from '../../db/database.js';
import { getUserById } from '../../db/db_users.js';
import { connectedClients, sendRawToClient } from "../../sse.js";
import { Game, GameSettings, GameStatus, Player, PlayerType } from "./gameFormats.js";

export let runningGames: Game[] = [];
let nextGameId = 0;

export async function startGame(admin: User, gameSettings: GameSettings) {
	let gameId = nextGameId++;
	let currPlayerID = 0;

	const readPlayers = gameSettings.players;
	let players: Player[] = [];

	players.push(new Player(PlayerType.USER, currPlayerID++, admin.id));
	sendRawToClient(admin.id, `data: ${JSON.stringify({ type: "game_admin_request", gameId, 'playerId': currPlayerID - 1 })}\n\n`);

	for (const readPlayer of readPlayers) {
		let player: Player | null = null;
		if (readPlayer.type === PlayerType.USER) {
			let id: number = readPlayer.id;
			if (id != admin.id) {
				let user = await getUserById(id);
				if (user !== null && connectedClients.has(id)) {
					player = new Player(PlayerType.USER, currPlayerID++, id);
					sendRawToClient(id, `data: ${JSON.stringify({ type: "game_request", gameId, 'playerId': currPlayerID - 1 })}\n\n`);
				} else {
					throw new Error("User not found or not connected");
				}
			} else {
				throw "Game-starting player should not be added as a player";
			}
		} else if (readPlayer.type === PlayerType.AI) {
			let aiLevel = readPlayer.aiLevel;
			player = new Player(PlayerType.AI, gameSettings.playerLives, currPlayerID++, null, null, aiLevel);
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

	runningGames.push(new Game(gameId, players, gameSettings));
}

const ticksPerSecond = 20;
setInterval(() => {
	for (const game of runningGames) {
		if (game.status === GameStatus.WAITING && game.isReady()) {
			game.status = GameStatus.RUNNING;
			console.log(`Game ${game.gameId} started!`);
		}
		if (game.status === GameStatus.WAITING)
			continue;

		// send updated game state to clients
		for (const player of game.players) {
			if (player.wsocket) {
				player.wsocket.send(JSON.stringify({ type: 'state', state: game.gameState }))
			}
		}
	}
}, 1000 / ticksPerSecond);
