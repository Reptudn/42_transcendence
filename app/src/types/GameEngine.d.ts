interface Point {
	x: number;
	y: number;
}

interface GameObject {
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

interface GameState {
	meta: {
		name: string;
		author: string;
		size_x: number;
		size_y: number;
	};
	objects: GameObject[];
}

interface AIBrainData {
	aiLastBallDistance: number;
	aiDelayCounter: number;
	aiLastTargetParam: number;
	lastAIMovementDirection: number;
}
