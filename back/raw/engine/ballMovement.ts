import { Point, GameState } from './engineFormats.js';
import { distance, normalize, subtractPoints } from './pointUtils.js';

// Determine if a point is within a polygon (ray-casting algorithm).
function pointInPolygon(point: Point, vs: Point[]): boolean {
	let inside = false;
	for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
		const xi = vs[i].x,
			yi = vs[i].y;
		const xj = vs[j].x,
			yj = vs[j].y;
		const intersect =
			yi > point.y !== yj > point.y &&
			point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
		if (intersect) inside = !inside;
	}
	return inside;
}

// Compute the minimum distance from a point to a line segment.
function distanceToSegment(point: Point, a: Point, b: Point): number {
	const ab = subtractPoints(b, a);
	const abLenSq = ab.x * ab.x + ab.y * ab.y;
	const t = Math.max(
		0,
		Math.min(1, ((point.x - a.x) * ab.x + (point.y - a.y) * ab.y) / abLenSq)
	);
	const projection = { x: a.x + t * ab.x, y: a.y + t * ab.y };
	return distance(point, projection);
}

// Determine if a circle (ball) collides with a polygon.
function circlePolygonCollision(
	center: Point,
	radius: number,
	polygon: Point[]
): boolean {
	// Check if the circle's center is inside the polygon.
	if (pointInPolygon(center, polygon)) return true;
	// Otherwise, check distance from circle center to each polygon edge.
	for (let i = 0; i < polygon.length - 1; i++) {
		const a = polygon[i];
		const b = polygon[i + 1];
		if (distanceToSegment(center, a, b) <= radius) return true;
	}
	return false;
}

// Compute an approximate collision normal for a circle colliding with a polygon.
function computeCollisionNormal(
	center: Point,
	radius: number,
	polygon: Point[]
): Point | null {
	let bestDist = Infinity;
	let bestNormal: Point | null = null;
	for (let i = 0; i < polygon.length - 1; i++) {
		const a = polygon[i];
		const b = polygon[i + 1];
		const dist = distanceToSegment(center, a, b);
		if (dist < bestDist) {
			bestDist = dist;
			const ab = subtractPoints(b, a);
			const abLenSq = ab.x * ab.x + ab.y * ab.y;
			const t = Math.max(
				0,
				Math.min(
					1,
					((center.x - a.x) * ab.x + (center.y - a.y) * ab.y) /
						abLenSq
				)
			);
			const closest = { x: a.x + t * ab.x, y: a.y + t * ab.y };
			bestNormal = normalize({
				x: center.x - closest.x,
				y: center.y - closest.y,
			});
		}
	}
	return bestNormal;
}

/* ─────────────────────────────────────────────────────────────
   BALL MOVEMENT
────────────────────────────────────────────────────────────── */

export function moveBall(gameState: GameState): GameState {
	const ball = gameState.objects.find((obj) => obj.type === 'ball');
	if (!ball) {
		console.warn('No ball found in game state.');
		return gameState;
	}

	if (!('center' in ball)) {
		console.error('Ball has no center.');
		return gameState;
	}
	if (!('radius' in ball)) {
		ball.radius = 2;
		console.warn('Ball has no radius. Defaulting to 2.');
	}

	const center: Point = (ball as any).center;
	const radius: number = (ball as any).radius;

	if (!ball.velocity) {
		ball.velocity = { x: 1, y: 1 };
		console.warn('Ball has no velocity. Defaulting to (1, 1).');
	}

	// Update the ball's center based on its velocity.
	center.x += ball.velocity.x;
	center.y += ball.velocity.y;

	// Check for collisions with paddles and obstacles.
	for (let obj of gameState.objects) {
		if (obj.type === 'paddle' || obj.type === 'obstacle') {
			if (circlePolygonCollision(center, radius, obj.shape)) {
				// Calculate the collision normal.
				const normal = computeCollisionNormal(
					center,
					radius,
					obj.shape
				);
				if (normal) {
					// Reflect the velocity using: v' = v - 2*(v·n)*n.
					const dot =
						ball.velocity.x * normal.x + ball.velocity.y * normal.y;
					ball.velocity.x = ball.velocity.x - 2 * dot * normal.x;
					ball.velocity.y = ball.velocity.y - 2 * dot * normal.y;

					// Nudge the ball slightly away to prevent it from sticking.
					center.x += normal.x;
					center.y += normal.y;
				}
				// For the sake of simplicity, we address only one collision per tick.
				break;
			}
		}
	}

	// Optionally, handle collisions with game boundaries.
	const { size_x, size_y } = gameState.meta;
	if (center.x - radius < 0 || center.x + radius > size_x) {
		ball.velocity.x = -ball.velocity.x;
		center.x = Math.max(radius, Math.min(center.x, size_x - radius));
	}
	if (center.y - radius < 0 || center.y + radius > size_y) {
		ball.velocity.y = -ball.velocity.y;
		center.y = Math.max(radius, Math.min(center.y, size_y - radius));
	}

	return gameState;
}
