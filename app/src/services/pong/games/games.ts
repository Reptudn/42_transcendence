import { tickEngine } from '../engine/engine.js';
import { Game, GameStatus } from './gameClass.js';
import { UserPlayer } from './playerClass.js';

export let runningGames: Game[] = [];

export function removeGame(gameId: number)
{
	runningGames = runningGames.filter(game => game.gameId !== gameId);
}

const ticksPerSecond = 20;
setInterval(async () => {
	for (const game of runningGames) {
		if (game.status === GameStatus.WAITING) continue;

		if (!game.isReady()) continue;

		tickEngine(game);

		// send updated game state to clients
		for (const player of game.players) {
			if (player instanceof UserPlayer && !player.wsocket) continue;
			player instanceof UserPlayer && player.wsocket && player.wsocket.send(
				JSON.stringify({ type: 'state', state: game.gameState })
			);
		}
	}
}, 1000 / ticksPerSecond);
