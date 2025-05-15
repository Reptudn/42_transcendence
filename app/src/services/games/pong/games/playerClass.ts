import type { WebSocket as WSWebSocket } from 'ws';
import type { Game } from './gameFormats';

export enum PlayerType {
	USER = 'USER',
	AI = 'AI',
	LOCAL = 'LOCAL',
}
export interface AIBrainData {
	aiLastBallDistance: number;
	aiDelayCounter: number;
	aiLastTargetParam: number;
	lastAIMovementDirection: number;
}

// base Player
export abstract class Player {
	abstract readonly type: PlayerType;
	constructor(public readonly playerId: number, public lives: number = 3) {}

	abstract isReady(game: Game): boolean;
}

// USER player
export class UserPlayer extends Player {
	readonly type = PlayerType.USER;
	constructor(
		playerId: number,
		lives: number,
		public wsocket: WSWebSocket | null,
		public readonly userId: number
	) {
		super(playerId, lives);
	}

	isReady(game: Game): boolean {
		return (
			this.wsocket !== null &&
			this.wsocket.readyState === this.wsocket.OPEN
		);
	}
}

// AI player
export class AIPlayer extends Player {
	readonly type = PlayerType.AI;
	constructor(
		playerId: number,
		lives: number,
		public aiLevel: number,
		public aiName: string,
		public aiBrainData: AIBrainData | null = null
	) {
		super(playerId, lives);
	}

	isReady(game: Game): boolean {
		return true;
	}
}

// LOCAL player
export class LocalPlayer extends Player {
	readonly type = PlayerType.LOCAL;
	constructor(
		playerId: number,
		lives: number,
		public parentId: number, // logged-in user on some device user id
		public localPlayerName: string
	) {
		super(playerId, lives);
	}

	isReady(game: Game): boolean {
		const admin = game.players.find(
			(p) => p instanceof UserPlayer && p.userId === this.parentId
		) as UserPlayer | undefined;

		return admin?.isReady(game) ?? false;
	}
}
