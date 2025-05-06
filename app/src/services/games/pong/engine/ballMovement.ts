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
	if (abLenSq === 0) return distance(point, a);
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

// Compute the collision response for a circle colliding with a polygon.
// Returns both the collision normal and the penetration depth.
function computeCollisionResponse(
	center: Point,
	radius: number,
	polygon: Point[]
): { normal: Point; penetration: number } | null {
	let bestPenetration = -Infinity;
	let bestNormal: Point | null = null;
	for (let i = 0; i < polygon.length - 1; i++) {
		const a = polygon[i];
		const b = polygon[i + 1];
		const dist = distanceToSegment(center, a, b);
		const penetration = radius - dist;
		if (penetration > bestPenetration && penetration > 0) {
			bestPenetration = penetration;
			const ab = subtractPoints(b, a);
			const abLenSq = ab.x * ab.x + ab.y * ab.y;
			let t = 0;
			if (abLenSq !== 0) {
				t = Math.max(
					0,
					Math.min(
						1,
						((center.x - a.x) * ab.x + (center.y - a.y) * ab.y) /
							abLenSq
					)
				);
			}
			const closest = { x: a.x + t * ab.x, y: a.y + t * ab.y };
			bestNormal = normalize({
				x: center.x - closest.x,
				y: center.y - closest.y,
			});
		}
	}
	return bestNormal
		? { normal: bestNormal, penetration: bestPenetration }
		: null;
}

/* ─────────────────────────────────────────────────────────────
   BALL MOVEMENT
────────────────────────────────────────────────────────────── */

export function moveBall(gameState: GameState, ballSpeed: number): GameState {
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

	if (!ball.velocity || (ball.velocity.x === 0 && ball.velocity.y === 0)) {
		const normFactor = Math.sqrt(2) / 2;
		ball.velocity = {
			x: ballSpeed * normFactor,
			y: ballSpeed * normFactor,
		};
		console.warn('Ball has no velocity. Defaulting to (1, 1).');
	}

	// Set ballSpeed - matching velocity
	{
		const currentSpeed = Math.sqrt(
			ball.velocity.x ** 2 + ball.velocity.y ** 2
		);
		if (currentSpeed !== 0) {
			ball.velocity.x = (ball.velocity.x / currentSpeed) * ballSpeed;
			ball.velocity.y = (ball.velocity.y / currentSpeed) * ballSpeed;
		}
	}

	const potentialCollisions: Point[][] = [];
	for (let obj of gameState.objects) {
		if (!obj.shape) continue;
		// Skip objects were inside of to avoid getting stuck within them.
		if (circlePolygonCollision(center, radius, obj.shape)) {
			continue;
		}
		if (obj.type === 'paddle' || obj.type === 'wall') {
			potentialCollisions.push(obj.shape);
		}
	}

	center.x += ball.velocity.x;
	center.y += ball.velocity.y;

	// collect all collision normals to compute all collisions in a tick at once
	const maxIterations = 5;
	for (let iter = 0; iter < maxIterations; iter++) {
		let collisionOccurred = false;
		let combinedNormal = { x: 0, y: 0 };
		let maxPenetration = 0;
		for (const polygon of potentialCollisions) {
			if (circlePolygonCollision(center, radius, polygon)) {
				const response = computeCollisionResponse(
					center,
					radius,
					polygon
				);
				if (response) {
					combinedNormal.x += response.normal.x;
					combinedNormal.y += response.normal.y;
					// We pick the maximum penetration to ensure a sufficient push.
					maxPenetration = Math.max(
						maxPenetration,
						response.penetration
					);
					collisionOccurred = true;
				}
			}
		}
		if (!collisionOccurred) break;
		combinedNormal = normalize(combinedNormal);
		// Adjust the ball's position to resolve penetration.
		center.x += combinedNormal.x * maxPenetration;
		center.y += combinedNormal.y * maxPenetration;
		// Reflect the velocity using the combined collision normal.
		const dot =
			ball.velocity.x * combinedNormal.x +
			ball.velocity.y * combinedNormal.y;
		ball.velocity.x = ball.velocity.x - 2 * dot * combinedNormal.x;
		ball.velocity.y = ball.velocity.y - 2 * dot * combinedNormal.y;
	}

	// Game boundary collisions
	const { size_x, size_y } = gameState.meta;
	if (center.x - radius < 0 || center.x + radius > size_x) {
		ball.velocity.x = -ball.velocity.x;
		center.x = Math.max(radius, Math.min(center.x, size_x - radius));
	}
	if (center.y - radius < 0 || center.y + radius > size_y) {
		ball.velocity.y = -ball.velocity.y;
		center.y = Math.max(radius, Math.min(center.y, size_y - radius));
	}

	// 45-degree magnetism to prevent single-path stuck balls
	{
		let velocityXSign = ball.velocity.x > 0 ? 1 : -1;
		let velocityYSign = ball.velocity.y > 0 ? 1 : -1;

		ball.velocity.x = Math.abs(ball.velocity.x);
		ball.velocity.y = Math.abs(ball.velocity.y);

		const nudgeFactor = 0.0015 * ballSpeed;
		if (ball.velocity.x < ball.velocity.y) {
			ball.velocity.x += nudgeFactor;
			ball.velocity.y -= nudgeFactor;
		}
		if (ball.velocity.y < ball.velocity.x) {
			ball.velocity.y += nudgeFactor;
			ball.velocity.x -= nudgeFactor;
		}

		ball.velocity.x *= velocityXSign;
		ball.velocity.y *= velocityYSign;
	}

	normalize(ball.velocity, ballSpeed);

	return gameState;
}
