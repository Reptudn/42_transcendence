import { User } from '../../db/database.js';
import { getUserById, getUserTitleString } from '../../db/db_users.js';
import { connectedClients, sendRawToClient } from '../../sse.js';
import {
	Game,
	GameSettings,
	GameStatus,
	Player,
	PlayerType,
} from './gameFormats.js';
import { getMapAsInitialGameState } from './rawMapHandler.js';

import defaultBotNames from '../../../../data/defaultBotNames.json' with { type: 'json' };
function getRandomDefaultName(): string {
	return defaultBotNames[Math.floor(Math.random() * defaultBotNames.length)];
}

export let runningGames: Game[] = [];
let nextGameId = 0;

export async function startGame(admin: User, gameSettings: GameSettings) {
	let gameId = nextGameId++;
	let currPlayerID = Math.floor(Math.random() * 4);

	const readPlayers = gameSettings.players;
	let players: Player[] = [];

	players.push(
		new Player(
			PlayerType.USER,
			currPlayerID % 4,
			gameSettings.playerLives,
			admin.id,
			null,
			null,
			null,
			admin.username,
			admin.displayname,
			await getUserTitleString(admin.id)
		)
	);
	sendRawToClient(
		admin.id,
		`data: ${JSON.stringify({
			type: 'game_admin_request',
			gameId,
			playerId: currPlayerID % 4,
		})}\n\n`
	);
	currPlayerID++;

	for (const readPlayer of readPlayers) {
		let player: Player | null = null;
		let playerID = currPlayerID % 4;
		currPlayerID++;
		if (readPlayer.type === PlayerType.USER) {
			let id: number = readPlayer.id;
			if (id != admin.id) {
				let user = await getUserById(id);
				if (user !== null && connectedClients.has(id)) {
					player = new Player(
						PlayerType.USER,
						playerID,
						gameSettings.playerLives,
						id,
						null,
						null,
						null,
						user.username,
						user.displayname,
						await getUserTitleString(user.id)
					);
					sendRawToClient(
						id,
						`data: ${JSON.stringify({
							type: 'game_request',
							gameId,
							playerId: playerID,
						})}\n\n`
					);
					currPlayerID++;
				} else {
					throw new Error(
						'User ' + id + 'not found or not connected'
					);
				}
			} else {
				throw new Error(
					'Game-starting player should not be added as a player'
				);
			}
		} else if (readPlayer.type === PlayerType.AI) {
			let aiLevel = readPlayer.aiLevel;
			player = new Player(
				PlayerType.AI,
				playerID,
				gameSettings.playerLives,
				null,
				null,
				aiLevel,
				null,
				null,
				null,
				readPlayer.aiOrLocalPlayerName
					? readPlayer.aiOrLocalPlayerName
					: getRandomDefaultName()
			);
		} else if (readPlayer.type === PlayerType.LOCAL) {
			player = new Player(
				PlayerType.LOCAL,
				playerID,
				gameSettings.playerLives,
				admin.id,
				null,
				null,
				readPlayer.localPlayerId,
				null,
				null,
				null,
				null,
				readPlayer.aiOrLocalPlayerName
					? readPlayer.aiOrLocalPlayerName
					: getRandomDefaultName()
			);
		} else {
			throw new Error('Invalid player type');
		}
		if (player !== null) {
			players.push(player);
		}
	}

	console.log('Game started with players:', players);

	runningGames.push(
		new Game(
			gameId,
			players,
			gameSettings,
			await getMapAsInitialGameState(gameSettings, admin.id)
		)
	);

	console.log(runningGames, 'runningGames');
}

const ticksPerSecond = 20;
setInterval(() => {
	for (const game of runningGames) {
		if (game.status === GameStatus.WAITING && game.isReady()) {
			game.status = GameStatus.RUNNING;
			console.log(`Game ${game.gameId} started!`);
		}
		if (game.status === GameStatus.WAITING) continue;

		// send updated game state to clients
		for (const player of game.players) {
			if (player.wsocket) {
				player.wsocket.send(
					JSON.stringify({ type: 'state', state: game.gameState })
				);
			}
		}
	}
}, 1000 / ticksPerSecond);
