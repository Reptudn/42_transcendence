import { movePaddle } from './paddleMovement.js';
import { moveBall, hasPlayerBeenHit } from './ballMovement.js';
import { updateAIMovement } from './aiBrain.js';
import { UserPlayer } from '../games/playerClass.js';
import { unlockAchievement } from '../../database/achievements.js';
import type { Game } from '../games/gameClass.js';

export function tickEngine(game: Game) {
	// move players
	for (const player of game.players) {
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
	for (const player of game.players) {
		if (hasPlayerBeenHit(game.gameState, player.playerId)) {
			player.lives--;
			if (player.lives <= 0) {
				const objectsToRemove: number[] = [];
				for (const obj of game.gameState.objects) {
					if (obj.playerNbr === player.playerId) {
						objectsToRemove.push(game.gameState.objects.indexOf(obj));
					}
				}
				for (const index of objectsToRemove) {
					game.gameState.objects.splice(index, 1);
				}
			}
		}
	}

	for (const p of game.players) {
		if (p instanceof UserPlayer) {
			if (Math.random() < 0.0001) {
				unlockAchievement(p.user.id, 'lucky', (game as any).fastify);
			}
		}
	}
}
