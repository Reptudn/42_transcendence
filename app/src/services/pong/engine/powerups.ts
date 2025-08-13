import { powerupDuration, powerupObjectRadius, type Game } from '../games/gameClass';

export function collectPowerups(game: Game) {
	for (const powerup of game.activePowerups) {
		if (powerup.started) continue;
		const ball = game.gameState.objects.find((o) => o.type === 'ball');
		if (!ball) continue;

		const powerupPos = powerup.position;
		const ballPos = ball?.center;
		const collectDistance = (ball.radius ?? 0) + powerupObjectRadius;

		if (ballPos && powerupPos) {
			const dx = ballPos.x - powerupPos.x;
			const dy = ballPos.y - powerupPos.y;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance < collectDistance) {
				powerup.started = true;
				powerup.expiresAt = Date.now() + powerupDuration;
			}
		}
	}
}
