import { Game } from '../games/gameClass.js';
import { AiPlayer } from '../games/playerClass.js';
import { distance } from './pointUtils.js';

export function projectPointOnPolyline(
	pt: Point,
	polyline: Point[]
): { param: number; closestPoint: Point } {
	let bestParam = 0;
	let bestDist = Infinity;
	let bestPoint: Point = polyline[0];
	let cumulative = 0;
	for (let i = 0; i < polyline.length - 1; i++) {
		const a = polyline[i];
		const b = polyline[i + 1];
		const segLen = distance(a, b);
		const abx = b.x - a.x;
		const aby = b.y - a.y;
		const abLenSq = segLen * segLen;
		let t = 0;
		if (abLenSq !== 0) {
			t = ((pt.x - a.x) * abx + (pt.y - a.y) * aby) / abLenSq;
		}
		t = Math.max(0, Math.min(1, t));
		const proj: Point = { x: a.x + t * abx, y: a.y + t * aby };
		const d = distance(pt, proj);
		const param = cumulative + t * segLen;
		if (d < bestDist) {
			bestDist = d;
			bestParam = param;
			bestPoint = proj;
		}
		cumulative += segLen;
	}
	return { param: bestParam, closestPoint: bestPoint };
}

export function updateAIMovement(game: Game): void {
	if (!game.gameState) return;
	const ball = game.gameState.objects.find((obj) => obj.type === 'ball');
	if (!ball || !ball.center) return;
	const ballPos = ball.center;

	for (const player of game.players) {
		if (!(player instanceof AiPlayer)) continue;
		if (player.spectator) continue;

		const damageArea = game.gameState.objects.find(
			(obj) =>
				obj.type === 'player_damage_area' &&
				obj.playerNbr === player.playerId
		);
		const paddlePath = game.gameState.objects.find(
			(obj) => obj.type === 'paddle_path' && obj.playerNbr === player.playerId
		);
		const paddle = game.gameState.objects.find(
			(obj) => obj.type === 'paddle' && obj.playerNbr === player.playerId
		);

		if (
			!damageArea ||
			!damageArea.shape ||
			!paddlePath ||
			!paddlePath.shape ||
			!paddle ||
			!paddle.anchor1
		) {
			console.warn(
				`AI Player ${player.displayName} missing damage area or paddle path or paddle`
			);
			continue;
		}

		// find the closest point on damage area to ball
		const { param: targetParam, closestPoint } = projectPointOnPolyline(
			ballPos,
			damageArea.shape
		);
		// find paddle pos on path
		const { param: currentParam } = projectPointOnPolyline(
			paddle.anchor1,
			paddlePath.shape
		);

		// Compute delta from desired pos
		const tolerance = 0.5;
		let desiredDirection = 0;
		const deltaParam = targetParam - currentParam;
		if (Math.abs(deltaParam) > tolerance) {
			desiredDirection = deltaParam > 0 ? 1 : -1;
		} else {
			desiredDirection = 0;
		}

		if (!player.aiBrainData) {
			player.aiBrainData = {
				aiLastBallDistance: distance(ballPos, closestPoint),
				aiDelayCounter: 0,
				aiLastTargetParam: targetParam,
				lastAIMovementDirection: 0,
			};
		}

		const level = game.config.gameDifficulty || 5;

		// random delay after collision
		const currentBallDistance = distance(ballPos, closestPoint);
		if (currentBallDistance > player.aiBrainData.aiLastBallDistance + 1) {
			player.aiBrainData.aiDelayCounter = Math.max(
				player.aiBrainData.aiDelayCounter,
				(10 - level) * 5
			);
		}
		if (player.aiBrainData.aiDelayCounter > 0) {
			player.aiBrainData.aiDelayCounter--;
			desiredDirection = 0;
		}

		// Future position prediction
		if (level === 9) {
			// Perfect predictio
			desiredDirection =
				targetParam - currentParam > tolerance
					? 1
					: targetParam - currentParam < -tolerance
					? -1
					: 0;
		} else {
			const predictionWeight = level / 9;
			const predictedTargetParam =
				targetParam +
				predictionWeight *
					(targetParam - player.aiBrainData.aiLastTargetParam);
			const predictedDelta = predictedTargetParam - currentParam;
			if (Math.abs(predictedDelta) > tolerance) {
				desiredDirection = predictedDelta > 0 ? 1 : -1;
			} else {
				desiredDirection = 0;
			}
		}

		// Random misstep
		if (level < 8) {
			const noiseProbability = (9 - level) / 9;
			if (Math.random() < noiseProbability * 0.3) {
				desiredDirection =
					desiredDirection === 0
						? Math.random() < 0.5
							? 1
							: -1
						: -desiredDirection;
			}
		}

		// Direction switch hesitation delay
		if (desiredDirection !== player.aiBrainData.lastAIMovementDirection) {
			if (player.aiBrainData.lastAIMovementDirection !== 0) {
				const switchDelay = Math.max(0, 5 - level);
				player.aiBrainData.aiDelayCounter = Math.max(
					player.aiBrainData.aiDelayCounter,
					switchDelay
				);
				desiredDirection = 0;
			}
		}

		player.movementDirection = desiredDirection;
		player.aiBrainData.lastAIMovementDirection = desiredDirection;
		player.aiBrainData.aiLastBallDistance = currentBallDistance;
		player.aiBrainData.aiLastTargetParam = targetParam;
	}
}
