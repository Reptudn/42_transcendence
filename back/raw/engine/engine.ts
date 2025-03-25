import { Game, Player } from '../games/gameFormats.js';
import { movePaddle } from './paddleMovement.js';

export function tickEngine(game: Game): Game {
	for (let player of game.players) {
		game.gameState = movePaddle(
			game.gameState,
			player.playerId,
			player.movementDirection,
			1
		);
	}

	return game;
}
