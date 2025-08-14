import { PowerupType, type Game } from '../games/gameClass.js';
import { AiPlayer } from '../games/playerClass.js';
import { distance } from './pointUtils.js';
import { circlePolygonCollision, moveBall } from './ballMovement.js';
import { ticksPerSecond } from '../games/games.js';

function polylineLength(polyline: Point[]): number {
	let len = 0;
	for (let i = 0; i < polyline.length - 1; i++)
		len += distance(polyline[i], polyline[i + 1]);
	return len;
}

function projectPercentOnPath(pt: Point, path: Point[]): number {
	const { param } = projectPointOnPolyline(pt, path);
	const total = polylineLength(path);
	return total > 0 ? Math.max(0, Math.min(1, param / total)) : 0;
}

function deepCloneGameState(state: GameState): GameState {
	return {
		meta: { ...state.meta },
		objects: state.objects.map((o) => {
			const clone: any = { ...o };
			clone.shape = Array.isArray(o.shape)
				? o.shape.map((p: Point) => ({ x: p.x, y: p.y }))
				: [];
			if (o.center) clone.center = { x: o.center.x, y: o.center.y };
			if (o.anchor1) clone.anchor1 = { x: o.anchor1.x, y: o.anchor1.y };
			if (o.anchor2) clone.anchor2 = { x: o.anchor2.x, y: o.anchor2.y };
			if (o.velocity) clone.velocity = { x: o.velocity.x, y: o.velocity.y };
			return clone;
		}),
	};
}

function centroid(points: Point[]): Point {
	let sx = 0,
		sy = 0;
	const n = points.length || 1;
	for (const p of points) {
		sx += p.x;
		sy += p.y;
	}
	return { x: sx / n, y: sy / n };
}

function translatePaddleToCenter(paddle: any, target: Point) {
	if (!Array.isArray(paddle.shape) || paddle.shape.length === 0) return;
	const c = centroid(paddle.shape);
	const dx = target.x - c.x;
	const dy = target.y - c.y;
	paddle.shape = paddle.shape.map((p: Point) => ({ x: p.x + dx, y: p.y + dy }));
	if (paddle.anchor1)
		paddle.anchor1 = { x: paddle.anchor1.x + dx, y: paddle.anchor1.y + dy };
	if (paddle.anchor2)
		paddle.anchor2 = { x: paddle.anchor2.x + dx, y: paddle.anchor2.y + dy };
}

function placeOpponentsBest(sim: GameState, selfId: number) {
	const ball = sim.objects.find((o) => o.type === 'ball');
	if (!ball || !('center' in ball)) return;
	const center = (ball as any).center as Point;

	for (const opp of sim.objects) {
		if (opp.type !== 'paddle' || opp.playerNbr === selfId) continue;
		const path = sim.objects.find(
			(o) => o.type === 'paddle_path' && o.playerNbr === opp.playerNbr
		);
		if (!path || !path.shape) continue;
		const { closestPoint } = projectPointOnPolyline(center, path.shape);
		translatePaddleToCenter(opp as any, closestPoint);
	}
}

function simulateAheadFindTargetPercent(
	base: GameState,
	playerId: number,
	seconds: number
): number | null {
	const sim = deepCloneGameState(base);
	sim.objects = sim.objects.filter(
		(o) => !(o.type === 'paddle' && o.playerNbr === playerId)
	);

	const dmg = sim.objects.find(
		(o) => o.type === 'player_damage_area' && o.playerNbr === playerId
	);
	const path = sim.objects.find(
		(o) => o.type === 'paddle_path' && o.playerNbr === playerId
	);
	if (!dmg || !dmg.shape || !path || !path.shape) return null;

	const steps = Math.max(1, Math.floor(seconds * ticksPerSecond));
	for (let i = 0; i < steps; i++) {
		placeOpponentsBest(sim, playerId);
		moveBall(sim, 3, false);

		const ball = sim.objects.find((o) => o.type === 'ball');
		if (!ball || !('center' in ball) || !('radius' in ball)) break;

		const center = (ball as any).center as Point;
		const radius = (ball as any).radius as number;

		if (circlePolygonCollision(center, radius, dmg.shape)) {
			const { closestPoint } = projectPointOnPolyline(center, dmg.shape);
			return projectPercentOnPath(closestPoint, path.shape);
		}
	}

	const ball = sim.objects.find((o) => o.type === 'ball');
	if (!ball || !('center' in ball)) return null;
	return projectPercentOnPath((ball as any).center as Point, path.shape);
}

export function projectPointOnPolyline(
	pt: Point,
	polyline: Point[]
): { param: number; closestPoint: Point } {
	let bestParam = 0;
	let bestDist = Number.POSITIVE_INFINITY;
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

function worsifyIntendedPercentBasedOnAiLevel(
	intendedPercent: number,
	aiLevel: number
): number {
	const L = Math.max(1, Math.min(10, aiLevel));
	const MAX_AMP = 0.5;
	const r = (10 - 3) / 9;
	const P = Math.log(0.07 / MAX_AMP) / Math.log(r);
	const t = (10 - L) / 9;
	const amp = MAX_AMP * Math.pow(t, P);
	const noisy = intendedPercent + (Math.random() * 2 - 1) * amp;
	return Math.max(0, Math.min(1, noisy));
}

export async function updateAIMovement(game: Game): Promise<void> {
	if (!game.gameState) return;

	for (const player of game.players) {
		if (!(player instanceof AiPlayer)) continue;
		if (player.spectator || player.lives <= 0) continue;

		const paddlePath = game.gameState.objects.find(
			(o) => o.type === 'paddle_path' && o.playerNbr === player.playerId
		);
		const paddle = game.gameState.objects.find(
			(o) => o.type === 'paddle' && o.playerNbr === player.playerId
		);
		if (!paddlePath || !paddlePath.shape || !paddle || !paddle.anchor1) continue;

		if (!player.aiBrainData) player.aiBrainData = {} as any;

		const now = Date.now();
		const needRecalc =
			typeof (player.aiBrainData as any).nextRecalcAt !== 'number' ||
			now >= (player.aiBrainData as any).nextRecalcAt;

		if (needRecalc) {
			const targetPercent =
				simulateAheadFindTargetPercent(game.gameState, player.playerId, 5) ??
				null;
			if (targetPercent !== null) {
				(player.aiBrainData as any).intendedPercent =
					worsifyIntendedPercentBasedOnAiLevel(
						targetPercent,
						player.aiDifficulty
					);
			} else if (
				typeof (player.aiBrainData as any).intendedPercent !== 'number'
			) {
				const currentPercent = projectPercentOnPath(
					paddle.anchor1,
					paddlePath.shape
				);
				(player.aiBrainData as any).intendedPercent =
					worsifyIntendedPercentBasedOnAiLevel(
						currentPercent,
						player.aiDifficulty
					);
			}
			(player.aiBrainData as any).nextRecalcAt = now + 1000;
		}

		const totalLen = polylineLength(paddlePath.shape);
		if (totalLen <= 0) continue;

		const currentPercent = projectPercentOnPath(
			paddle.anchor1,
			paddlePath.shape
		);
		const intended = Math.max(
			0,
			Math.min(
				1,
				(player.aiBrainData as any).intendedPercent ?? currentPercent
			)
		);

		const tolerance = 0.02;
		let dir = 0;
		if (intended - currentPercent > tolerance) dir = 1;
		else if (currentPercent - intended > tolerance) dir = -1;

		player.movementDirection = dir;

		if (
			game.activePowerups.find(
				(p) => p.type === PowerupType.InverseControls && p.started
			)
		) {
			player.movementDirection *= -1;
		}
	}
}
