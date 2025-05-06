export interface Point {
	x: number;
	y: number;
}

export interface GameObject {
	type: string;
	name: string;
	playerNbr?: number;
	shape: Point[];
	velocity?: { x: number; y: number };
	center?: Point;
	radius?: number;
	anchor1?: Point;
	anchor2?: Point;
}

export interface GameState {
	meta: {
		name: string;
		author: string;
		size_x: number;
		size_y: number;
	};
	objects: GameObject[];
}
