import { Game } from '../games/gameFormats.js';
import { movePaddle } from './paddleMovement.js';
import { moveBall } from './ballMovement.js';

export function tickEngine(game: Game): Game {
	for (let player of game.players) {
		game.gameState = movePaddle(
			game.gameState,
			player.playerId,
			player.movementDirection,
			3
		);
	}

	game.gameState = moveBall(game.gameState);

	return game;
}
