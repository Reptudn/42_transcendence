import {
	powerupDuration,
	powerupObjectRadius,
	PowerupType,
	type Game,
} from '../games/gameClass.js';

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

				if (powerup.type === PowerupType.Redirection) {
					if (ball.velocity) {
						const speed =
							Math.hypot(ball.velocity.x, ball.velocity.y) || 3;
						const theta = Math.random() * 2 * Math.PI;
						ball.velocity.x = Math.cos(theta) * speed;
						ball.velocity.y = Math.sin(theta) * speed;
					}
					powerup.expiresAt = Date.now();
				} else if (powerup.type === PowerupType.BallSplosion) {
					for (let i = 0; i < 20; i++) {
						const miniBall = {
							type: 'miniBall',
							name: `miniBall${i}`,
							center: { x: ballPos.x, y: ballPos.y },
							velocity: {
								x: Math.random() * 2 - 1,
								y: Math.random() * 2 - 1,
							},
							radius: Math.max(
								0.3,
								Math.min(
									(ball.radius ?? powerupObjectRadius) *
										(0.6 + Math.random() * 0.8),
									2
								)
							),
							shape: [],
						};
						game.gameState.objects.push(miniBall);
					}
				}
			}
		}
	}
}
