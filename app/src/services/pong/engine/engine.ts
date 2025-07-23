import { movePaddle } from './paddleMovement.js';
import { moveBall, hasPlayerBeenHit } from './ballMovement.js';
import { updateAIMovement } from './aiBrain.js';
import type { Game } from '../games/gameClass.js';

export function tickEngine(game: Game) {
	// move players
	for (let player of game.players) {
		if (player.lives <= 0) continue;
		game.gameState = movePaddle(
			game.gameState,
			player.playerId,
			player.movementDirection,
			3
		);
	}
	updateAIMovement(game);

	// move ball
	game.gameState = moveBall(game.gameState, 3);

	// check hits
	for (let player of game.players) {
		if (hasPlayerBeenHit(game.gameState, player.playerId)) {
			player.lives--;
			if (player.lives <= 0) {
				game.removePlayer(player.playerId, false);
			}
		}
	}
}
