import { movePaddle } from './paddleMovement.js';
import { moveBall, hasPlayerBeenHit } from './ballMovement.js';
import { updateAIMovement } from './aiBrain.js';
import { LocalPlayer, UserPlayer } from '../games/playerClass.js';
import { unlockAchievement } from '../../database/achievements.js';
import type { Game } from '../games/gameClass.js';
import { collectPowerups } from './powerups.js';
import { PowerupType } from '../games/gameClass.js';

export function tickEngine(game: Game) {
	// move players
	for (const player of game.players) {
		if (player.lives <= 0) continue;
		const reversed = game.activePowerups.find(
			(p) => p.type === PowerupType.InverseControls && p.started
		);
		const isHuman =
			player instanceof UserPlayer || player instanceof LocalPlayer;
		const dir =
			reversed && isHuman
				? -player.movementDirection
				: player.movementDirection;
		game.gameState = movePaddle(game.gameState, player.playerId, dir, 3);
	}
	updateAIMovement(game);

	// move ball
	game.gameState = moveBall(game.gameState, 3);
	collectPowerups(game);

	// check hits
	for (const player of game.players) {
		if (player.spectator) continue;
		if (hasPlayerBeenHit(game.gameState, player.playerId)) {
			game.ballSpeed = 3;
			player.lives = Math.max(0, player.lives - 1);
			if (player.lives === 0) {
				game.gameState.objects = game.gameState.objects.filter(
					(o) => o.playerNbr !== player.playerId
				);
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
