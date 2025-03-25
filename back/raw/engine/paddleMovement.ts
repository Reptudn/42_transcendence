import { Point, GameState } from './engineFormats';

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
	if (typeof direction !== 'number' || isNaN(direction)) {
		console.error('Invalid direction value:', direction);
		direction = 0;
	}
	if (typeof speed !== 'number' || isNaN(speed)) {
		console.error('Invalid speed value:', speed);
		speed = 1;
	}
	if (speed === 0 || direction == 0) {
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
			if (
				param >= cumulativeLengths[i] &&
				param <= cumulativeLengths[i + 1]
			) {
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

	function distance(a: Point, b: Point): number {
		return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
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

	// Obtain new anchor positions.
	const newAnchor1 = getPointAtParam(newParam1);
	const newAnchor2 = getPointAtParam(newParam2);

	// Update the paddle's anchors (ensuring they remain on the path).
	paddle.anchor1 = newAnchor1;
	paddle.anchor2 = newAnchor2;

	// Now, let us adjust the paddle's shape vertices.
	// We preserve the offset of each vertex from the anchor it is closer to.
	// This is crucial to avoid any unsightly mirroring or snapping issues.
	const newShape: Point[] = [];
	// Check if the shape is "closed" (i.e. first and last points coincide).
	let isClosed = false;
	if (paddle.shape.length > 1) {
		const first = paddle.shape[0];
		const last = paddle.shape[paddle.shape.length - 1];
		if (first.x === last.x && first.y === last.y) {
			isClosed = true;
		}
	}

	// If closed, we update all but the last vertex and then duplicate the first.
	const vertexCount = isClosed
		? paddle.shape.length - 1
		: paddle.shape.length;

	for (let i = 0; i < vertexCount; i++) {
		const vertex = paddle.shape[i];
		// Determine which original anchor is nearer.
		const d1 = distance(vertex, originalAnchor1);
		const d2 = distance(vertex, originalAnchor2);
		let offset: Point;
		if (d1 <= d2) {
			offset = {
				x: vertex.x - originalAnchor1.x,
				y: vertex.y - originalAnchor1.y,
			};
			newShape.push({
				x: newAnchor1.x + offset.x,
				y: newAnchor1.y + offset.y,
			});
		} else {
			offset = {
				x: vertex.x - originalAnchor2.x,
				y: vertex.y - originalAnchor2.y,
			};
			newShape.push({
				x: newAnchor2.x + offset.x,
				y: newAnchor2.y + offset.y,
			});
		}
	}
	// If the shape was closed, ensure it remains so.
	if (isClosed) {
		newShape.push({ x: newShape[0].x, y: newShape[0].y });
	}
	paddle.shape = newShape;

	return gameState;
}
