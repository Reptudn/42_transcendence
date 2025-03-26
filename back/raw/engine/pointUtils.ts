import { Point } from './engineFormats';

export function distance(a: Point, b: Point): number {
	return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
export function normalize(p: Point, target: number = 1): Point {
	const len = distance({ x: 0, y: 0 }, p);
	return len === 0
		? { x: 0, y: 0 }
		: { x: (p.x / len) * target, y: (p.y / len) * target };
}
export function subtractPoints(a: Point, b: Point): Point {
	return { x: a.x - b.x, y: a.y - b.y };
}
export function addPoints(a: Point, b: Point): Point {
	return { x: a.x + b.x, y: a.y + b.y };
}
export function rotatePoint(p: Point, angle: number): Point {
	return {
		x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
		y: p.x * Math.sin(angle) + p.y * Math.cos(angle),
	};
}
export function angleOf(vec: Point): number {
	return Math.atan2(vec.y, vec.x);
}
