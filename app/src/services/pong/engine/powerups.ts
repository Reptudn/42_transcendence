import { unlockAchievement } from '../../database/achievements.js';
import {
	GameStatus,
	powerupCheckDelay,
	powerupDuration,
	powerupObjectRadius,
	powerupSpawnChance,
	PowerupType,
	type Game,
} from '../games/gameClass.js';
import { UserPlayer } from '../games/playerClass.js';

function getPowerupSpawns(game: Game): Point[] {
	const spawns: Point[] = [];
	for (const o of game.gameState.objects) {
		if (o.type === 'powerup_spawn') {
			if ((o as any).center) spawns.push((o as any).center as Point);
			else if (o.shape && o.shape.length > 0) spawns.push(o.shape[0]);
		}
	}
	return spawns;
}
function choosePowerupType(_game: Game): PowerupType {
	const vals = Object.values(PowerupType);
	const isNumericEnum = vals.some((v) => typeof v === 'number');
	const values = (isNumericEnum
		? vals.filter((v) => typeof v === 'number')
		: vals.filter((v) => typeof v === 'string')) as unknown as PowerupType[];
	const idx = Math.floor(Math.random() * values.length);
	return values[idx];
}

export function managePowerups(game: Game) {
	if (game.status !== GameStatus.RUNNING) return;
	const now = Date.now();

	// end ballsplosion
	const hasActiveBallSplosion = game.activePowerups.some(
		(p) => p.started && p.type === PowerupType.BallSplosion && p.expiresAt > now
	);
	if (!hasActiveBallSplosion) {
		game.gameState.objects = game.gameState.objects.filter(
			(o) => o.type !== 'miniBall'
		);
	}

	// end speedup
	const hasSpeedUp = game.activePowerups.some(
		(p) => p.type === PowerupType.SpeedUp && p.started && p.expiresAt > now
	);
	game.ballSpeed = hasSpeedUp ? 6 : 3;

	// clean ended powerups
	if (game.activePowerups.length) {
		game.activePowerups = game.activePowerups.filter((p) =>
			p.started ? p.expiresAt > now : true
		);
	}

	// spawn new powerups
	if (!game.config.powerupsEnabled) return;
	if (now >= game.nextPowerupCheckAt) {
		game.nextPowerupCheckAt = now + powerupCheckDelay;
		if (Math.random() < powerupSpawnChance && game.activePowerups.length <= 4) {
			const spawns = getPowerupSpawns(game);
			if (spawns.length) {
				const pos = spawns[Math.floor(Math.random() * spawns.length)];
				const type = choosePowerupType(game);
				if (game.activePowerups.filter((p) => p.type === type).length > 0) {
					return;
				}
				if (
					game.activePowerups.some(
						(p) => p.position.x === pos.x && p.position.y === pos.y
					)
				)
					return;
				game.activePowerups.push({
					type,
					position: { x: pos.x, y: pos.y },
					expiresAt: now + powerupDuration,
					started: false,
				});
			}
		}
	}
}

export function handoutPowerupAchievements(game: Game) {
	for (const player of game.players) {
		if (!(player instanceof UserPlayer)) continue;
		if (player.spectator === true) continue; // Don't hand powerups out to people just watching a game in tournament
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
			if (powerup.type === PowerupType.BallSplosion && powerup.started) {
				unlockAchievement(
					player.user.id,
					'powerup-ballsplosion',
					(game as any).fastify
				);
			}
			if (powerup.type === PowerupType.SpeedUp && powerup.started) {
				unlockAchievement(
					player.user.id,
					'powerup-speedup',
					(game as any).fastify
				);
			}
		}
	}
}

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
				} else if (powerup.type === PowerupType.SpeedUp) {
					game.ballSpeed *= 1.75;
				}
			}
		}
	}
}
