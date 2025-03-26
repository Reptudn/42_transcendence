interface Point {
	x: number;
	y: number;
}

interface GameObject {
	type: string;
	name?: string;
	position?: Point;
	velocity?: Point;
	shape?: Point[];
	playerNbr?: number;
	anchor1?: Point;
	anchor2?: Point;
	center?: Point;
	radius?: number;
}

interface GameState {
	objects: GameObject[];
	mapWidth?: number;
	mapHeight?: number;
}

interface TrailElement {
	center: Point;
	time: number;
}

const ballTrail: TrailElement[] = [];
const trailLifetime: number = 1000;

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function interpolatePoint(p1: Point, p2: Point, t: number): Point {
	return {
		x: lerp(p1.x, p2.x, t),
		y: lerp(p1.y, p2.y, t),
	};
}
function interpolateGameObject(
	obj1: GameObject,
	obj2: GameObject,
	t: number
): GameObject {
	const interpolated: GameObject = { ...obj2 };

	if (obj1.center && obj2.center) {
		interpolated.center = interpolatePoint(obj1.center, obj2.center, t);
	}

	if (obj1.shape && obj2.shape && obj1.shape.length === obj2.shape.length) {
		interpolated.shape = obj1.shape.map((pt, i) =>
			interpolatePoint(pt, obj2.shape![i], t)
		);
	}

	return interpolated;
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function isPointInsideCanvas(x: number, y: number): boolean {
	return x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height;
}

function clearCanvas(): void {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawCircle(
	x: number,
	y: number,
	radius: number,
	fillStyle: string
): void {
	ctx.beginPath();
	if (!isPointInsideCanvas(x, y))
		console.log('Point is outside canvas:', x, y);
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fillStyle = fillStyle;
	ctx.fill();
}

function drawPolygon(
	points: Point[],
	strokeStyle: string,
	color: string = 'black',
	lineWidth: number = 2,
	closePath: boolean = true
): void {
	if (points.length === 0) return;
	const path = new Path2D();
	path.moveTo(points[0].x, points[0].y);
	for (let i = 1; i < points.length; i++) {
		path.lineTo(points[i].x, points[i].y);
		if (!isPointInsideCanvas(points[i].x, points[i].y))
			console.log('Point is outside canvas:', points[i]);
	}
	if (closePath) path.closePath();
	ctx.fillStyle = color;
	ctx.fill(path);
	ctx.strokeStyle = strokeStyle;
	ctx.lineWidth = lineWidth;
	ctx.stroke(path);
}

function transformPoints(points: Point[], scale: number): Point[] {
	return points.map((pt) => ({ x: pt.x * scale, y: pt.y * scale }));
}

function drawTrailSegment(
	elem1: TrailElement,
	elem2: TrailElement,
	scale: number,
	now: number,
	baseRadius: number
): void {
	const age1 = now - elem1.time;
	const age2 = now - elem2.time;

	const opacity1 = Math.max(0, 1 - age1 / trailLifetime);
	const opacity2 = Math.max(0, 1 - age2 / trailLifetime);

	const width1 = baseRadius * (1 - age1 / trailLifetime) * scale;
	const width2 = baseRadius * (1 - age2 / trailLifetime) * scale;

	const dx = (elem2.center.x - elem1.center.x) * scale;
	const dy = (elem2.center.y - elem1.center.y) * scale;
	const len = Math.hypot(dx, dy);
	if (len === 0) return;

	const pdx = -dy / len;
	const pdy = dx / len;

	const p1_left = {
		x: elem1.center.x * scale + pdx * width1,
		y: elem1.center.y * scale + pdy * width1,
	};
	const p1_right = {
		x: elem1.center.x * scale - pdx * width1,
		y: elem1.center.y * scale - pdy * width1,
	};
	const p2_left = {
		x: elem2.center.x * scale + pdx * width2,
		y: elem2.center.y * scale + pdy * width2,
	};
	const p2_right = {
		x: elem2.center.x * scale - pdx * width2,
		y: elem2.center.y * scale - pdy * width2,
	};

	const path = new Path2D();
	path.moveTo(p1_left.x, p1_left.y);
	path.lineTo(p2_left.x, p2_left.y);
	path.lineTo(p2_right.x, p2_right.y);
	path.lineTo(p1_right.x, p1_right.y);
	path.closePath();

	const avgOpacity = (opacity1 + opacity2) / 2;
	ctx.fillStyle = `rgba(255, 0, 0, ${avgOpacity})`;
	ctx.fill(path);
}

function drawGameState(
	gameState: GameState,
	mapWidth: number = 100,
	mapHeight: number = 100
): void {
	console.log('Drawing game state:', gameState);
	mapWidth = gameState.mapWidth ?? mapWidth;
	mapHeight = gameState.mapHeight ?? mapHeight;

	const scaleX = canvas.width / mapWidth;
	const scaleY = canvas.height / mapHeight;
	const scale = Math.min(scaleX, scaleY);

	clearCanvas();

	for (const obj of gameState.objects) {
		switch (obj.type) {
			case 'ball':
				if (obj.center && obj.radius) {
					const now = performance.now();

					for (let i = 0; i < ballTrail.length - 3; i++) {
						drawTrailSegment(
							ballTrail[i],
							ballTrail[i + 1],
							scale,
							now,
							obj.radius
						);
					}

					const posX = obj.center.x * scale;
					const posY = obj.center.y * scale;
					const radius = obj.radius * scale;
					drawCircle(posX, posY, radius, 'red');
				} else {
					console.log(
						'Ball object does not have a center or radius:',
						obj
					);
				}
				break;

			case 'paddle':
				if (obj.shape && obj.shape.length > 0) {
					const points = transformPoints(obj.shape, scale);
					drawPolygon(points, '', 'blue');
				} else console.log('Paddle object does not have a shape:', obj);
				break;

			case 'wall':
				if (obj.shape && obj.shape.length > 0) {
					const points = transformPoints(obj.shape, scale);
					drawPolygon(points, '', 'black');
				} else console.log('Wall object does not have a shape:', obj);
				break;
		}
	}
}

// Animation Manager

let previousState: GameState | null = null;
let currentState: GameState | null = null;
let lastUpdateTime: number = performance.now();
const tickInterval = 1000 / 20; // 20 ticks per second
let mapSizeX = 100;
let mapSizeY = 100;

export function updateGameState(
	newState: GameState,
	mapSizeX: number,
	mapSizeY: number
): void {
	previousState = currentState;
	currentState = newState;
	lastUpdateTime = performance.now();
	mapSizeX = mapSizeX;
	mapSizeY = mapSizeY;
}

function render(): void {
	const now = performance.now();
	const t = Math.min((now - lastUpdateTime) / tickInterval, 1);

	if (currentState) {
		const ballObj = currentState.objects.find(
			(obj) => obj.type === 'ball' && obj.center
		);
		if (ballObj && ballObj.center) {
			ballTrail.push({ center: { ...ballObj.center }, time: now });
		}
	}
	while (ballTrail.length && now - ballTrail[0].time > trailLifetime) {
		ballTrail.shift();
	}

	if (previousState && currentState) {
		const interpolatedState: GameState = {
			mapWidth: currentState.mapWidth,
			mapHeight: currentState.mapHeight,
			objects: currentState.objects.map((currObj, index) => {
				const prevObj = previousState!.objects[index];
				if (prevObj && currObj.type === prevObj.type) {
					return interpolateGameObject(prevObj, currObj, t);
				}
				return currObj;
			}),
		};
		drawGameState(interpolatedState, mapSizeX, mapSizeY);
	} else if (currentState) {
		drawGameState(currentState, mapSizeX, mapSizeY);
	}
	requestAnimationFrame(render);
}

requestAnimationFrame(render);
