import {
	Game,
	GameSettings,
	GameStatus,
	Player,
	PlayerType,
} from './gameFormats.js';
import { getMapAsInitialGameState } from './rawMapHandler.js';
import { tickEngine } from '../engine/engine.js';

const defaultBotNames = require('../../../../data/defaultBotNames.json');
import { getUserTitleString, getUserById } from '../../../database/db_users.js';
import { connectedClients, sendRawToClient } from '../../../sse/sse.js';
function getRandomDefaultName(): string {
	return defaultBotNames[Math.floor(Math.random() * defaultBotNames.length)];
}

export let runningGames: Game[] = [];
let nextGameId = 0;

export async function startGame(admin: User, gameSettings: GameSettings) {
	if (gameSettings.players.length > 3) {
		throw new Error('Too many players');
	}

	let gameId = nextGameId++;
	const players: Player[] = [];

	players.push(
		new Player(
			PlayerType.USER,
			-1,
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

	for (const readPlayer of gameSettings.players) {
		let player: Player | null = null;
		if (readPlayer.type === PlayerType.USER) {
			const friendId = readPlayer.id;
			if (friendId === admin.id) {
				throw new Error(
					'Game-starting player should not be added as a player'
				);
			}
			const user = await getUserById(friendId);
			if (user && connectedClients.has(friendId)) {
				player = new Player(
					PlayerType.USER,
					-1,
					gameSettings.playerLives,
					friendId,
					null,
					null,
					null,
					user.username,
					user.displayname,
					await getUserTitleString(user.id)
				);
			} else {
				throw new Error(`User ${friendId} not found or not connected`);
			}
		} else if (readPlayer.type === PlayerType.AI) {
			player = new Player(
				PlayerType.AI,
				-1,
				gameSettings.playerLives,
				null,
				null,
				readPlayer.aiLevel,
				null,
				null,
				null,
				readPlayer.aiOrLocalPlayerName || getRandomDefaultName()
			);
		} else if (readPlayer.type === PlayerType.LOCAL) {
			player = new Player(
				PlayerType.LOCAL,
				-1,
				gameSettings.playerLives,
				admin.id,
				null,
				null,
				readPlayer.localPlayerId,
				null,
				null,
				null,
				readPlayer.aiOrLocalPlayerName || getRandomDefaultName()
			);
		} else {
			throw new Error('Invalid player type');
		}

		if (player !== null) {
			players.push(player);
		}
	}

	const totalPlayers = players.length;
	const offset = Math.floor(Math.random() * totalPlayers);
	const rotatedPlayers = players
		.slice(offset)
		.concat(players.slice(0, offset));

	rotatedPlayers.forEach((player, index) => {
		player.playerId = index;

		if (
			player.userId &&
			player.type == PlayerType.USER &&
			player.userId !== admin.id &&
			connectedClients.has(player.userId)
		) {
			sendRawToClient(
				player.userId,
				`data: ${JSON.stringify({
					type: 'game_request',
					gameId,
					playerId: index,
				})}\n\n`
			);
		}
	});

	sendRawToClient(
		admin.id,
		`data: ${JSON.stringify({
			type: 'game_admin_request',
			gameId,
			playerId: rotatedPlayers.find((p) => p.userId === admin.id)
				?.playerId,
		})}\n\n`
	);

	runningGames.push(
		new Game(
			gameId,
			rotatedPlayers,
			gameSettings,
			await getMapAsInitialGameState(gameSettings)
		)
	);

	console.log('Game started with players:', rotatedPlayers);
	console.log('Game settings:', gameSettings);
}

const ticksPerSecond = 20;
setInterval(() => {
	for (const game of runningGames) {
		if (game.status === GameStatus.WAITING && game.isReady()) {
			game.status = GameStatus.RUNNING;
			console.log(`Game ${game.gameId} started!`);
		}
		if (game.status === GameStatus.WAITING) continue;

		tickEngine(game);

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
