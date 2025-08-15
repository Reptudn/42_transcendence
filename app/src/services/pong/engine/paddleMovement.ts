import {
	distance,
	normalize,
	subtractPoints,
	addPoints,
	rotatePoint,
	angleOf,
} from './pointUtils.js';
import { circlePolygonCollision, computeCollisionResponse } from './ballMovement.js';

/**
 * Moves the given player's paddle along its path.
 *
 * @param gameState - The current game state.
 * @param playerId - The id of the player (1,2,3,4).
 * @param direction - Movement direction: 1 (forward), 0 (none), -1 (backward).
 * @param speed - The movement speed (i.e. how far to move along the path).
 * @returns The updated game state.
 */
export function movePaddle(
	gameState: GameState,
	playerId: number,
	direction: number,
	speed: number
): GameState {
	if (typeof direction !== 'number' || Number.isNaN(direction)) {
		console.error('Invalid direction value:', direction);
		direction = 0;
	}
	if (typeof speed !== 'number' || Number.isNaN(speed)) {
		console.error('Invalid speed value:', speed);
		speed = 1;
	}
	if (speed === 0 || direction === 0) {
		return gameState;
	}

	const paddle = gameState.objects.find(
		(obj) => obj.type === 'paddle' && obj.playerNbr === playerId
	);
	const paddlePath = gameState.objects.find(
		(obj) => obj.type === 'paddle_path' && obj.playerNbr === playerId
	);
	if (!paddle || !paddlePath) {
		console.warn('Paddle or path not found for player', playerId);
		return gameState;
	}

	const pathPoints: Point[] = paddlePath.shape;

	// Compute segment lengths and cumulative distances.
	const segments: number[] = [];
	const cumulativeLengths: number[] = [0];
	let totalLength = 0;
	for (let i = 0; i < pathPoints.length - 1; i++) {
		const p1 = pathPoints[i];
		const p2 = pathPoints[i + 1];
		const segLength = distance(p1, p2);
		segments.push(segLength);
		totalLength += segLength;
		cumulativeLengths.push(totalLength);
	}

	const continuous: boolean =
		pathPoints[0].x === pathPoints[pathPoints.length - 1].x &&
		pathPoints[0].y === pathPoints[pathPoints.length - 1].y;

	// Helper: Projects a given point onto the path,
	// returning the parameter (distance along the path) closest to that point.
	function projectPointToPath(pt: Point): number {
		let bestParam = 0;
		let bestDist = Infinity;
		for (let i = 0; i < pathPoints.length - 1; i++) {
			const p1 = pathPoints[i];
			const p2 = pathPoints[i + 1];
			const t = projectOnSegment(pt, p1, p2);
			const proj: Point = {
				x: p1.x + t * (p2.x - p1.x),
				y: p1.y + t * (p2.y - p1.y),
			};
			const d = distance(pt, proj);
			const param = cumulativeLengths[i] + t * segments[i];
			if (d < bestDist) {
				bestDist = d;
				bestParam = param;
			}
		}
		return bestParam;
	}

	// Helper: Returns the point on the path at a given parameter (distance).
	function getPointAtParam(param: number): Point {
		if (continuous) {
			param = ((param % totalLength) + totalLength) % totalLength;
		} else {
			param = Math.max(0, Math.min(param, totalLength));
		}
		// Identify the segment that contains the new parameter.
		let segmentIndex = 0;
		for (let i = 0; i < cumulativeLengths.length - 1; i++) {
			if (param >= cumulativeLengths[i] && param <= cumulativeLengths[i + 1]) {
				segmentIndex = i;
				break;
			}
		}
		const segLength = segments[segmentIndex] || 1; // Avoid division by zero.
		const segParam = (param - cumulativeLengths[segmentIndex]) / segLength;
		const p1 = pathPoints[segmentIndex];
		const p2 = pathPoints[segmentIndex + 1];
		return {
			x: p1.x + segParam * (p2.x - p1.x),
			y: p1.y + segParam * (p2.y - p1.y),
		};
	}

	// Helper: Projects a point onto a line segment defined by points a and b.
	// Returns a parameter t (0 ≤ t ≤ 1) indicating the relative position along the segment.
	function projectOnSegment(pt: Point, a: Point, b: Point): number {
		const apx = pt.x - a.x;
		const apy = pt.y - a.y;
		const abx = b.x - a.x;
		const aby = b.y - a.y;
		const abLenSq = abx * abx + aby * aby;
		if (abLenSq === 0) return 0;
		let t = (apx * abx + apy * aby) / abLenSq;
		return Math.max(0, Math.min(1, t));
	}

	// Save original anchor positions to compute vertex offsets later.
	const originalAnchor1 = { x: paddle.anchor1!.x, y: paddle.anchor1!.y };
	const originalAnchor2 = { x: paddle.anchor2!.x, y: paddle.anchor2!.y };

	// Determine the current parameter values for both anchors.
	const param1 = projectPointToPath(originalAnchor1);
	const param2 = projectPointToPath(originalAnchor2);

	// Update parameters by moving along the path.
	const newParam1 = param1 + direction * speed;
	const newParam2 = param2 + direction * speed;

	// prevent movement too close to edges
	if (!continuous) {
		const origDistance = distance(originalAnchor1, originalAnchor2);
		const EDGE_MARGIN = origDistance / 2;
		if (newParam1 < EDGE_MARGIN || newParam2 > totalLength - EDGE_MARGIN) {
			return gameState;
		}
	}

	const newAnchor1 = getPointAtParam(newParam1);
	const computedNewAnchor2 = getPointAtParam(newParam2);

	// Ensure the new distance between anchors matches the original.
	const origDistance = distance(originalAnchor1, originalAnchor2);
	const computedDistance = distance(newAnchor1, computedNewAnchor2);
	let newAnchor2: Point;
	if (Math.abs(computedDistance - origDistance) > 0.001) {
		const norm = normalize(subtractPoints(computedNewAnchor2, newAnchor1));
		newAnchor2 = {
			x: newAnchor1.x + norm.x * origDistance,
			y: newAnchor1.y + norm.y * origDistance,
		};
	} else {
		newAnchor2 = computedNewAnchor2;
	}

	// Compute the rotation needed.
	const originalVector = subtractPoints(originalAnchor2, originalAnchor1);
	const newVector = subtractPoints(newAnchor2, newAnchor1);
	const deltaAngle = angleOf(newVector) - angleOf(originalVector);

	// Apply the rigid transformation to the paddle shape.
	const newShape: Point[] = [];
	for (const vertex of paddle.shape) {
		const relative = subtractPoints(vertex, originalAnchor1);
		const rotated = rotatePoint(relative, deltaAngle);
		const transformed = addPoints(newAnchor1, rotated);
		newShape.push(transformed);
	}

	// Update the paddle with its new anchors and shape.
	const delta = subtractPoints(newAnchor1, originalAnchor1);
	const ballObj = gameState.objects.find((o) => o.type === 'ball') as any;

	if (ballObj && ballObj.center && typeof ballObj.radius === 'number') {
		const overlapsAfterMove = circlePolygonCollision(
			ballObj.center,
			ballObj.radius,
			newShape
		);
		if (overlapsAfterMove) {
			const resp = computeCollisionResponse(
				ballObj.center,
				ballObj.radius,
				newShape
			);
			if (resp) {
				ballObj.center = {
					x: ballObj.center.x + resp.normal.x * (resp.penetration + 0.5),
					y: ballObj.center.y + resp.normal.y * (resp.penetration + 0.5),
				};
				const paddleDelta = delta;
				const relV = {
					x: (ballObj.velocity?.x ?? 0) - paddleDelta.x,
					y: (ballObj.velocity?.y ?? 0) - paddleDelta.y,
				};
				const relDot = relV.x * resp.normal.x + relV.y * resp.normal.y;
				if (relDot < 0) {
					const v = ballObj.velocity ?? { x: 0, y: 0 };
					ballObj.velocity = {
						x: v.x - 2 * relDot * resp.normal.x,
						y: v.y - 2 * relDot * resp.normal.y,
					};
				}
			}
		}
	}

	paddle.anchor1 = newAnchor1;
	paddle.anchor2 = newAnchor2;
	paddle.shape = newShape;

	return gameState;
}
