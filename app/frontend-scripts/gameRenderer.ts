import { showLocalError, showLocalInfo } from './alert.js';
import { onUnloadPageAsync } from './navigator.js';

let previousState: GameState | null = null;
let currentState: GameState | null = null;
let lastUpdateTime: number = performance.now();

const tickInterval = 1000 / 20;

let mapSizeX = 100;
let mapSizeY = 100;

let trailColor = { r: 255, g: 0, b: 0 };
let lastVector: { x: number; y: number } | null = null;

const ballTrail: TrailElement[] = [];
const trailLifetime: number = 750;

const playerColors = [
	{ r: 255, g: 160, b: 160 },
	{ r: 255, g: 255, b: 170 },
	{ r: 180, g: 255, b: 180 },
	{ r: 180, g: 210, b: 255 },
];
export function getPlayerColor(index: number) {
	const c = playerColors[index % playerColors.length];
	return { r: c.r, g: c.g, b: c.b };
}

const powerupSettings = [
	{
		type: 'inverse_controls',
		icon: '/static/assets/images/powerups/inverse_controls.png',
		color: { r: 255, g: 0, b: 0 },
	},
	{
		type: 'redirection',
		icon: '/static/assets/images/powerups/redirection.png',
		color: { r: 0, g: 255, b: 0 },
	},
	{
		type: 'nausea',
		icon: '/static/assets/images/powerups/nausea.png',
		color: { r: 0, g: 0, b: 255 },
	},
	{
		type: 'wonky_ball',
		icon: '/static/assets/images/powerups/wonky_ball.png',
		color: { r: 128, g: 128, b: 0 },
	},
];

const canonical = (s: string) => s.toLowerCase().replace(/[\s\-_]+/g, '');
const powerupSettingsMap = new Map(
	powerupSettings.map((s) => [canonical(s.type), s])
);

const iconReady = new Map<string, HTMLImageElement>();
const iconFailed = new Set<string>();
const iconLoading = new Set<string>();
function ensureIcon(path: string) {
	if (iconReady.has(path) || iconFailed.has(path) || iconLoading.has(path)) return;
	iconLoading.add(path);
	const img = new Image();
	img.onload = () => {
		if (img.naturalWidth > 0) {
			iconReady.set(path, img);
		} else {
			iconFailed.add(path);
			console.warn('Powerup icon has zero size:', path);
		}
		iconLoading.delete(path);
	};
	img.onerror = () => {
		iconFailed.add(path);
		iconLoading.delete(path);
		console.warn('Powerup icon failed to load:', path);
	};
	img.src = path;
	img.decode?.().catch(() => {});
}

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
	activePowerups?: {
		type: string;
		position: Point;
		started: boolean;
		expiresAt: number;
	}[];
}

interface TrailElement {
	center: Point;
	time: number;
	color: { r: number; g: number; b: number };
}

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

export function interpolatePoint(p1: Point, p2: Point, t: number): Point {
	return {
		x: lerp(p1.x, p2.x, t),
		y: lerp(p1.y, p2.y, t),
	};
}
export function interpolateGameObject(
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
			obj2.shape ? interpolatePoint(pt, obj2.shape[i], t) : pt
		);
	}

	return interpolated;
}

let canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
let ctx = canvas.getContext('2d');
if (!ctx) {
	throw new Error('Failed to get 2D context from canvas');
}

let nauseaEffectEnabled = false;

function setNauseaEffectEnabled(enabled: boolean) {
	if (enabled && !nauseaEffectEnabled) {
		canvas.classList.add('glow-rainbow-border', 'easter-egg');
		canvas.classList.remove('game-canvas-background');
		nauseaEffectEnabled = true;
	} else if (!enabled && nauseaEffectEnabled) {
		canvas.classList.remove('glow-rainbow-border', 'easter-egg');
		canvas.classList.add('game-canvas-background');
		nauseaEffectEnabled = false;
	}
}

function isPowerupActive(state: GameState | null, type: string): boolean {
	if (!state?.activePowerups) return false;
	const now = Date.now();
	const key = canonical(type);
	return state.activePowerups.some(
		(p) => canonical(p.type) === key && p.started && p.expiresAt > now
	);
}

export function initCanvas() {
	canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
	ctx = canvas.getContext('2d');
	if (!ctx) {
		throw new Error('Failed to get 2D context from canvas');
	}
	for (const s of powerupSettings) ensureIcon(s.icon);
	startRendering();
}

export function isPointInsideCanvas(x: number, y: number): boolean {
	return x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height;
}

export function clearCanvas(): void {
	if (ctx) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
	}
}

export function drawCircle(
	x: number,
	y: number,
	radius: number,
	color: { r: number; g: number; b: number }
): void {
	if (ctx) {
		ctx.beginPath();
		if (!isPointInsideCanvas(x, y))
			console.log('Point is outside canvas:', x, y);
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
		ctx.fill();
	} else {
		showLocalError('Canvas context is null');
	}
}
export function drawPolygon(
	points: Point[],
	strokeStyle: string,
	color = 'black',
	lineWidth = 2,
	closePath = true
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
	if (ctx) {
		ctx.fillStyle = color;
		ctx.fill(path);
		ctx.strokeStyle = strokeStyle;
		ctx.lineWidth = lineWidth;
		ctx.stroke(path);
	} else {
		showLocalError('Canvas context is null');
	}
}
function drawPolyline(
	points: Point[],
	stroke: string,
	width: number,
	dash: number[]
): void {
	if (!ctx || points.length < 2) return;
	const path = new Path2D();
	path.moveTo(points[0].x, points[0].y);
	for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y);
	ctx.save();
	ctx.setLineDash(dash);
	ctx.lineWidth = width;
	ctx.strokeStyle = stroke;
	ctx.stroke(path);
	ctx.restore();
}
export function drawPowerupIcon(
	x: number,
	y: number,
	scale: number,
	type: string,
	fill = true
) {
	if (!ctx) return;
	const settings = powerupSettingsMap.get(canonical(type));
	const radius = 3 * scale;
	const color = settings
		? `rgb(${settings.color.r}, ${settings.color.g}, ${settings.color.b})`
		: '#888';

	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);

	if (fill) {
		ctx.fillStyle = color;
		ctx.fill();

		if (!settings) return;
		const path = settings.icon;
		const ready = iconReady.get(path);
		if (ready) {
			const size = radius * 1.6;
			ctx.drawImage(ready, x - size / 2, y - size / 2, size, size);
			return;
		}
		if (!iconFailed.has(path)) ensureIcon(path);
	} else {
		ctx.lineWidth = 3;
		ctx.strokeStyle = color;
		ctx.stroke();
	}
}
function drawActivePowerupBadge(
	x: number,
	y: number,
	scale: number,
	type: string,
	remainingSeconds: number
) {
	if (!ctx) return;
	ctx.save();
	ctx.globalAlpha = 0.5;
	drawPowerupIcon(x, y, scale, type, false);
	ctx.restore();

	ctx.save();
	const radius = 3 * scale;
	const fontSize = Math.max(10, Math.floor(radius * 0.9));
	ctx.font = `${fontSize}px "Courier New", monospace`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.lineWidth = 3;
	ctx.strokeText(String(remainingSeconds), x, y);
	ctx.fillStyle = '#fff';
	ctx.fillText(String(remainingSeconds), x, y);
	ctx.restore();
}

export function transformPoints(points: Point[], scale: number): Point[] {
	return points.map((pt) => ({ x: pt.x * scale, y: pt.y * scale }));
}

export function normalize(v: Point): Point {
	const mag = Math.hypot(v.x, v.y);
	return mag === 0 ? { x: 0, y: 0 } : { x: v.x / mag, y: v.y / mag };
}

export function computeOffsetPoints(
	points: Point[],
	widths: number[]
): { left: Point[]; right: Point[] } {
	const left: Point[] = [];
	const right: Point[] = [];

	for (let i = 0; i < points.length; i++) {
		const p = points[i];
		let offset: Point;

		if (i === 0) {
			const d = normalize({ x: points[1].x - p.x, y: points[1].y - p.y });
			offset = { x: -d.y, y: d.x };
			left.push({
				x: p.x + offset.x * (widths[i] / 2),
				y: p.y + offset.y * (widths[i] / 2),
			});
			right.push({
				x: p.x - offset.x * (widths[i] / 2),
				y: p.y - offset.y * (widths[i] / 2),
			});
		} else if (i === points.length - 1) {
			const d = normalize({
				x: p.x - points[i - 1].x,
				y: p.y - points[i - 1].y,
			});
			offset = { x: -d.y, y: d.x };
			left.push({
				x: p.x + offset.x * (widths[i] / 2),
				y: p.y + offset.y * (widths[i] / 2),
			});
			right.push({
				x: p.x - offset.x * (widths[i] / 2),
				y: p.y - offset.y * (widths[i] / 2),
			});
		} else {
			const pPrev = points[i - 1];
			const pNext = points[i + 1];
			const d1 = normalize({ x: p.x - pPrev.x, y: p.y - pPrev.y });
			const d2 = normalize({ x: pNext.x - p.x, y: pNext.y - p.y });
			const n1 = { x: -d1.y, y: d1.x };
			const n2 = { x: -d2.y, y: d2.x };
			const miter = normalize({ x: n1.x + n2.x, y: n1.y + n2.y });
			const dot = miter.x * n1.x + miter.y * n1.y;
			const miterLength = widths[i] / 2 / dot;
			left.push({
				x: p.x + miter.x * miterLength,
				y: p.y + miter.y * miterLength,
			});
			right.push({
				x: p.x - miter.x * miterLength,
				y: p.y - miter.y * miterLength,
			});
		}
	}

	return { left, right };
}

export function drawBallTrail(scale: number, baseRadius: number): void {
	if (ballTrail.length < 2) return;
	const now = performance.now();

	const points: Point[] = [];
	const widths: number[] = [];
	const alphas: number[] = [];
	for (const elem of ballTrail) {
		const scaledPt = { x: elem.center.x * scale, y: elem.center.y * scale };
		points.push(scaledPt);
		const age = now - elem.time;
		const lifeFactor = 1 - Math.min(age / trailLifetime, 1);
		widths.push(baseRadius * scale * 2 * lifeFactor);
		alphas.push(lifeFactor);
	}

	const { left, right } = computeOffsetPoints(points, widths);

	for (let i = 0; i < points.length - 1; i++) {
		const pLeftStart = left[i];
		const pLeftEnd = left[i + 1];
		const pRightEnd = right[i + 1];
		const pRightStart = right[i];

		const trapezoid = new Path2D();
		trapezoid.moveTo(pLeftStart.x, pLeftStart.y);
		trapezoid.lineTo(pLeftEnd.x, pLeftEnd.y);
		trapezoid.lineTo(pRightEnd.x, pRightEnd.y);
		trapezoid.lineTo(pRightStart.x, pRightStart.y);
		trapezoid.closePath();

		if (!ctx) {
			console.error('Canvas context is null');
			return;
		}
		const grad = ctx.createLinearGradient(
			points[i].x,
			points[i].y,
			points[i + 1].x,
			points[i + 1].y
		);

		grad.addColorStop(
			0,
			`rgba(${ballTrail[i].color.r}, ${ballTrail[i].color.g}, ${ballTrail[i].color.b}, ${alphas[i]})`
		);
		grad.addColorStop(
			1,
			`rgba(${ballTrail[i + 1].color.r}, ${ballTrail[i + 1].color.g}, ${
				ballTrail[i + 1].color.b
			}, ${alphas[i + 1]})`
		);

		ctx.fillStyle = grad;
		ctx.fill(trapezoid);
	}
}

export function drawGameState(gameState: GameState): void {
	const scaleX = canvas.width / mapSizeX;
	const scaleY = canvas.height / mapSizeY;
	const scale = Math.min(scaleX, scaleY);

	clearCanvas();

	for (const obj of gameState.objects) {
		switch (obj.type) {
			case 'ball':
				if (obj.center && obj.radius) {
					const posX = obj.center.x * scale;
					const posY = obj.center.y * scale;
					const radius = obj.radius * scale;
					drawCircle(posX, posY, radius, trailColor);
				} else {
					showLocalInfo(
						`Ball object does not have a center or radius: ${obj}`
					);
				}
				break;

			case 'paddle':
				if (obj.shape && obj.shape.length > 0) {
					const points = transformPoints(obj.shape, scale);
					const c = getPlayerColor(obj.playerNbr ?? 0);
					drawPolygon(
						points,
						'rgba(0,0,0,0)',
						`rgb(${c.r}, ${c.g}, ${c.b})`
					);
				} else showLocalInfo(`Paddle object does not have a shape: ${obj}`);
				break;

			case 'wall':
				if (obj.shape && obj.shape.length > 0) {
					const points = transformPoints(obj.shape, scale);
					drawPolygon(points, '', 'black');
				} else console.log('Wall object does not have a shape:', obj);
				break;

			case 'player_damage_area':
				if (obj.shape && obj.shape.length > 1) {
					const points = transformPoints(obj.shape, scale);
					const c = getPlayerColor(obj.playerNbr ?? 0);
					const w = Math.max(1);
					drawPolyline(
						points,
						`rgba(${c.r}, ${c.g}, ${c.b}, 0.95)`,
						w,
						[12, 8]
					);
				}
				break;
		}
	}
	if (gameState.activePowerups) {
		const nowMs = Date.now();
		for (const p of gameState.activePowerups) {
			const x = p.position.x * scale;
			const y = p.position.y * scale;
			if (p.started) {
				const remainingMs = p.expiresAt - nowMs;
				if (remainingMs > 0) {
					const remainingSeconds = Math.max(
						0,
						Math.ceil(remainingMs / 1000)
					);
					drawActivePowerupBadge(x, y, scale, p.type, remainingSeconds);
				}
			} else {
				drawPowerupIcon(x, y, scale, p.type);
			}
		}
	}
	setNauseaEffectEnabled(isPowerupActive(gameState, 'nausea'));
}

export function updateGameState(
	newState: GameState,
	newMapSizeX: number,
	newMapSizeY: number
): void {
	previousState = currentState;
	currentState = newState;
	lastUpdateTime = performance.now();
	mapSizeX = newMapSizeX;
	mapSizeY = newMapSizeY;
	detectBounce(newState);
}

export function randomLightColor(): { r: number; g: number; b: number } {
	const min = 160;
	const max = 255;
	let r = min + Math.floor(Math.random() * (max - min + 1));
	let g = min + Math.floor(Math.random() * (max - min + 1));
	let b = min + Math.floor(Math.random() * (max - min + 1));
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	if (luminance < 190) {
		const boost = 190 - luminance;
		r = Math.min(255, Math.round(r + boost * 0.3));
		g = Math.min(255, Math.round(g + boost * 0.6));
		b = Math.min(255, Math.round(b + boost * 0.1));
	}
	return { r, g, b };
}
export function detectBounce(state: GameState): void {
	function calculateAngleDifference(
		v1: { x: number; y: number },
		v2: { x: number; y: number }
	): number {
		const dot = v1.x * v2.x + v1.y * v2.y;
		const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
		const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
		if (mag1 === 0 || mag2 === 0) {
			return 0;
		}
		let cosTheta = dot / (mag1 * mag2);
		cosTheta = Math.max(-1, Math.min(1, cosTheta));
		const angleRadians = Math.acos(cosTheta);
		const angleDegrees = angleRadians * (180 / Math.PI);
		return angleDegrees;
	}

	for (const obj of state.objects) {
		if (obj.type === 'ball' && obj.velocity) {
			const newVector = { x: obj.velocity.x, y: obj.velocity.y };
			if (lastVector) {
				const angleDiff = calculateAngleDifference(lastVector, newVector);
				if (angleDiff > 10) {
					trailColor = randomLightColor();
				}
			}
			lastVector = newVector;
		}
	}
}

let animationId: number | null = null;
let isRendering = false;
export function render(): void {
	if (!isRendering) return;
	const now = performance.now();
	const t = Math.min((now - lastUpdateTime) / tickInterval, 1);

	let interpolatedBallCenter: Point | null = null;
	if (previousState && currentState) {
		const prevBall = previousState.objects.find(
			(obj) => obj.type === 'ball' && obj.center
		);
		const currBall = currentState.objects.find(
			(obj) => obj.type === 'ball' && obj.center
		);
		if (prevBall && currBall && prevBall.center && currBall.center) {
			interpolatedBallCenter = interpolatePoint(
				prevBall.center,
				currBall.center,
				t
			);
		}
	} else if (currentState) {
		const currBall = currentState.objects.find(
			(obj) => obj.type === 'ball' && obj.center
		);
		if (currBall?.center) {
			interpolatedBallCenter = currBall.center;
		}
	}

	if (interpolatedBallCenter) {
		ballTrail.push({
			center: { ...interpolatedBallCenter },
			time: now,
			color: { ...trailColor },
		});
	}
	while (ballTrail.length && now - ballTrail[0].time > trailLifetime) {
		ballTrail.shift();
	}

	if (previousState && currentState) {
		const interpolatedState: GameState = {
			mapWidth: currentState.mapWidth,
			mapHeight: currentState.mapHeight,
			activePowerups: currentState.activePowerups,
			objects: currentState.objects.map((currObj, index) => {
				const prevObj = previousState
					? previousState.objects[index]
					: undefined;
				if (prevObj && currObj.type === prevObj.type) {
					return interpolateGameObject(prevObj, currObj, t);
				}
				return currObj;
			}),
		};
		drawGameState(interpolatedState);
	} else if (currentState) {
		drawGameState(currentState);
	}

	const ballObj = currentState?.objects.find(
		(obj) => obj.type === 'ball' && obj.radius
	);
	if (ballObj?.radius) {
		const scaleX = canvas.width / (currentState?.mapWidth ?? mapSizeX);
		const scaleY = canvas.height / (currentState?.mapHeight ?? mapSizeY);
		const scale = Math.min(scaleX, scaleY);
		drawBallTrail(scale, ballObj.radius);
	}

	animationId = requestAnimationFrame(render);
}

export function startRendering(): void {
	if (!isRendering) {
		isRendering = true;
		animationId = requestAnimationFrame(render);
	}
}

startRendering();

export function stopRendering(): void {
	isRendering = false;
	if (animationId !== null) {
		cancelAnimationFrame(animationId);
		animationId = null;
	}
}

startRendering();

declare global {
	interface Window {
		initCanvas: () => void;
		startRendering: () => void;
		stopRendering: () => void;
	}
}

onUnloadPageAsync(async () => {
	stopRendering();
});

window.initCanvas = initCanvas;
window.startRendering = startRendering;
window.stopRendering = stopRendering;
