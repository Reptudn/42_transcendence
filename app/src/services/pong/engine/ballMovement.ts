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
export function circlePolygonCollision(
	center: Point,
	radius: number,
	polygon: Point[]
): boolean {
	// Check if the circle's center is inside the polygon.
	if (pointInPolygon(center, polygon)) return true;
	// Otherwise, check distance from circle center to each polygon edge.
	const n = polygon.length;
	for (let i = 0; i < n; i++) {
		const a = polygon[i];
		const b = polygon[(i + 1) % n];
		if (distanceToSegment(center, a, b) <= radius) return true;
	}
	return false;
}

// Compute the collision response for a circle colliding with a polygon.
// Returns both the collision normal and the penetration depth.
export function computeCollisionResponse(
	center: Point,
	radius: number,
	polygon: Point[]
): { normal: Point; penetration: number } | null {
	let bestPenetration = Number.NEGATIVE_INFINITY;
	let bestNormal: Point | null = null;
	let minDist = Number.POSITIVE_INFINITY;
	let closestPoint: Point = polygon[0];

	for (let i = 0; i < polygon.length; i++) {
		const a = polygon[i];
		const b = polygon[(i + 1) % polygon.length];
		const dist = distanceToSegment(center, a, b);
		if (dist < minDist) {
			const ab = subtractPoints(b, a);
			const abLenSq = ab.x * ab.x + ab.y * ab.y;
			let t = 0;
			if (abLenSq !== 0) {
				t = Math.max(
					0,
					Math.min(
						1,
						((center.x - a.x) * ab.x + (center.y - a.y) * ab.y) / abLenSq
					)
				);
			}
			closestPoint = { x: a.x + t * ab.x, y: a.y + t * ab.y };
			minDist = dist;
		}

		const penetration = radius - dist;
		if (penetration > bestPenetration && penetration > 0) {
			bestPenetration = penetration;
			bestNormal = normalize({
				x: center.x - closestPoint.x,
				y: center.y - closestPoint.y,
			});
		}
	}

	if (bestNormal) {
		return { normal: bestNormal, penetration: bestPenetration };
	}

	if (pointInPolygon(center, polygon)) {
		const outNormal = normalize({
			x: closestPoint.x - center.x,
			y: closestPoint.y - center.y,
		});
		const penetration = minDist + radius;
		return { normal: outNormal, penetration };
	}

	return null;
}

/* ─────────────────────────────────────────────────────────────
   BALL MOVEMENT
────────────────────────────────────────────────────────────── */

export function moveBall(
	gameState: GameState,
	ballSpeed: number,
	wonky: boolean
): GameState {
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
		const theta = Math.random() * 2 * Math.PI;
		ball.velocity = {
			x: Math.cos(theta) * ballSpeed,
			y: Math.sin(theta) * ballSpeed,
		};
	}

	// Set ballSpeed - matching velocity
	{
		const currentSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
		if (currentSpeed !== 0) {
			ball.velocity.x = (ball.velocity.x / currentSpeed) * ballSpeed;
			ball.velocity.y = (ball.velocity.y / currentSpeed) * ballSpeed;
		}
	}

	const potentialCollisions: Point[][] = [];
	for (const obj of gameState.objects) {
		if (!obj.shape) continue;
		// Skip objects were inside of to avoid getting stuck within them.
		if (pointInPolygon(center, obj.shape)) continue;
		if (obj.type === 'paddle' || obj.type === 'wall') {
			potentialCollisions.push(obj.shape);
		}
	}

	center.x += ball.velocity.x;
	center.y += ball.velocity.y;

	// collect all collision normals to compute all collisions in a tick at once
	const maxIterations = 5;
	for (let iter = 0; iter < maxIterations; iter++) {
		const collisions: { normal: Point; penetration: number }[] = [];
		for (const polygon of potentialCollisions) {
			if (circlePolygonCollision(center, radius, polygon)) {
				const response = computeCollisionResponse(center, radius, polygon);
				if (response) collisions.push(response);
			}
		}
		if (collisions.length === 0) break;

		const sep = { x: 0, y: 0 };
		let maxPen = 0;
		for (const c of collisions) {
			sep.x += c.normal.x * c.penetration;
			sep.y += c.normal.y * c.penetration;
			if (c.penetration > maxPen) maxPen = c.penetration;
		}
		const sepLen = Math.hypot(sep.x, sep.y);
		if (sepLen > 0) {
			const scale = Math.min(1, maxPen / sepLen);
			center.x += sep.x * scale;
			center.y += sep.y * scale;
		}

		for (const c of collisions) {
			const dot = ball.velocity.x * c.normal.x + ball.velocity.y * c.normal.y;
			if (dot < 0) {
				ball.velocity.x -= 2 * dot * c.normal.x;
				ball.velocity.y -= 2 * dot * c.normal.y;
			}
		}
	}

	// end of tick collision resolving safety net if something went wrong before
	{
		const allPolys: Point[][] = [];
		for (const o of gameState.objects) {
			if (o.shape && (o.type === 'paddle' || o.type === 'wall'))
				allPolys.push(o.shape);
		}
		for (let i = 0; i < 4; i++) {
			let fixed = false;
			for (const poly of allPolys) {
				if (!circlePolygonCollision(center, radius, poly)) continue;
				const resp = computeCollisionResponse(center, radius, poly);
				if (!resp) continue;
				center.x += resp.normal.x * resp.penetration;
				center.y += resp.normal.y * resp.penetration;
				const dot =
					ball.velocity.x * resp.normal.x +
					ball.velocity.y * resp.normal.y;
				if (dot < 0) {
					ball.velocity.x -= 2 * dot * resp.normal.x;
					ball.velocity.y -= 2 * dot * resp.normal.y;
				}
				fixed = true;
			}
			if (!fixed) break;
		}
	}

	if (wonky) {
		const degreeRange = 20; // Range in degrees, e.g. 20 for ±10°
		const radRange = (degreeRange * Math.PI) / 180; // Convert to radians
		const angleAdjust = (Math.random() - 0.5) * radRange;
		const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
		const currentAngle = Math.atan2(ball.velocity.y, ball.velocity.x);
		const newAngle = currentAngle + angleAdjust;
		ball.velocity.x = Math.cos(newAngle) * speed;
		ball.velocity.y = Math.sin(newAngle) * speed;
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
		const speed = Math.hypot(ball.velocity.x, ball.velocity.y) || ballSpeed;
		const angle = Math.atan2(ball.velocity.y, ball.velocity.x);

		const low = (40 * Math.PI) / 180;
		const high = (50 * Math.PI) / 180;
		const halfPi = Math.PI / 2;

		let phi = angle % halfPi;
		if (phi < 0) phi += halfPi;

		let newAngle = angle;
		const maxStep = (0.25 * Math.PI) / 180;

		if (phi < low) {
			const delta = Math.min(low - phi, maxStep);
			newAngle += delta;
		} else if (phi > high) {
			const delta = Math.min(phi - high, maxStep);
			newAngle -= delta;
		}

		ball.velocity.x = Math.cos(newAngle) * speed;
		ball.velocity.y = Math.sin(newAngle) * speed;
	}

	normalize(ball.velocity, ballSpeed);

	return gameState;
}

export function hasPlayerBeenHit(gameState: GameState, playerId: number): boolean {
	const ball = gameState.objects.find((o) => o.type === 'ball');
	if (!ball || !('center' in ball) || !('radius' in ball)) return false;

	const center = (ball as any).center as Point;
	const radius = (ball as any).radius as number;

	const dmg = gameState.objects.find(
		(o) => o.type === 'player_damage_area' && o.playerNbr === playerId
	);
	if (!dmg || !dmg.shape) return false;

	const isOverlapping = circlePolygonCollision(center, radius, dmg.shape);

	if (isOverlapping) {
		if (!dmg.overlapping_ball) {
			dmg.overlapping_ball = true;
			return true;
		}
		return false;
	} else {
		dmg.overlapping_ball = false;
		return false;
	}
}
