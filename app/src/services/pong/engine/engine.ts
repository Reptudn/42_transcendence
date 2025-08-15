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
		const dir = reversed ? -player.movementDirection : player.movementDirection;
		game.gameState = movePaddle(game.gameState, player.playerId, dir, 3);
	}
	void updateAIMovement(game);

	// move ball
	game.gameState = moveBall(
		game.gameState,
		3,
		game.activePowerups.find(
			(p) => p.type === PowerupType.WonkyBall && p.started
		) !== undefined
	);

	// powerups
	collectPowerups(game);
	for (const player of game.players) {
		if (!(player instanceof UserPlayer)) continue;
		for (const powerup of game.activePowerups) {
			if (powerup.type === PowerupType.WonkyBall && powerup.started) {
				unlockAchievement(
					player.user.id,
					'powerup-wonky-ball',
					(game as any).fastify
				);
			}
			if (powerup.type === PowerupType.PhasingPaddle && powerup.started) {
				unlockAchievement(
					player.user.id,
					'powerup-phasing-paddle',
					(game as any).fastify
				);
			}
			if (powerup.type === PowerupType.PhasingBall && powerup.started) {
				unlockAchievement(
					player.user.id,
					'powerup-phasing-ball',
					(game as any).fastify
				);
			}
			if (powerup.type === PowerupType.InverseControls && powerup.started) {
				unlockAchievement(
					player.user.id,
					'powerup-inverse-controls',
					(game as any).fastify
				);
			}
			if (powerup.type === PowerupType.Nausea && powerup.started) {
				unlockAchievement(
					player.user.id,
					'powerup-nausea',
					(game as any).fastify
				);
			}
			if (powerup.type === PowerupType.Redirection && powerup.started) {
				unlockAchievement(
					player.user.id,
					'powerup-redirection',
					(game as any).fastify
				);
			}
		}
	}

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
				for (const localPlayer of game.players) {
					if (
						localPlayer instanceof LocalPlayer &&
						localPlayer.owner.playerId === player.playerId
					) {
						game.gameState.objects = game.gameState.objects.filter(
							(o) => o.playerNbr !== localPlayer.playerId
						);
					}
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
