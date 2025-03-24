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
}

interface GameState {
	objects: GameObject[];
	mapWidth?: number;
	mapHeight?: number;
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

export function drawGameState(
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
		console.log('Drawing object:', obj, 'with type:', obj.type);
		switch (obj.type) {
			case 'ball':
				if (obj.position) {
					const posX = obj.position.x * scale;
					const posY = obj.position.y * scale;
					drawCircle(posX, posY, 5, 'red');
				} else
					console.log('Ball object does not have a position:', obj);
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
