import type { WebSocket as WSWebSocket } from 'ws';

export interface GameSettings {
	players: [
		// 1 - 4
		{
			type: PlayerType;
			id: number;
			aiLevel?: number;
			localPlayerId?: number;
			aiOrLocalPlayerName?: string;
		}
	];
	gameDifficulty: number; // 1 - 10
	powerups: boolean;
	map: string; // map name from data/maps/*.json
	playerLives: number; // >= 1
}
export interface StatePlayer {
	type: PlayerType;
	id: number;
	username: string;
	displayName: string;
	playerTitle: string;
}

export class Game {
	gameId: number;
	status: GameStatus;
	players: Player[];
	gameState: object;
	powerups: boolean;

	constructor(
		gameId: number,
		players: Player[],
		gameSettings: GameSettings,
		gameState: object
	) {
		this.gameId = gameId;
		this.status = GameStatus.WAITING;
		this.players = players;
		this.gameState = gameState;
		console.log(this.gameState);
		this.powerups = gameSettings.powerups;
	}

	isReady() {
		for (const player of this.players) {
			if (!player.isReady()) {
				return false;
			}
		}
		return true;
	}
}
export class Player {
	type: PlayerType;
	playerId: number; // unique within a game, not to be confused with user id system

	// PlayerType.USER
	userId: number | null;
	wsocket: WSWebSocket | null;

	// PlayerType.AI
	aiLevel: number | null;

	// PlayerType.LOCAL
	// for local players, userId saves admin user id
	localPlayerId: number | null;

	// live game data
	lives = 3;
	movementDirection: MovementDirection = MovementDirection.NONE;
	// aiMoveCoolDown: number = aiLevel;

	constructor(
		type: PlayerType,
		playerId: number,
		lives: number,
		userId: number | null = null,
		wsocket: WSWebSocket | null = null,
		aiLevel: number | null = null,
		localPlayerId: number | null = null
	) {
		this.type = type;
		this.playerId = playerId;
		this.lives = lives;
		this.userId = userId;
		this.wsocket = wsocket;
		this.aiLevel = aiLevel;
		this.localPlayerId = localPlayerId;
	}

	isReady() {
		return this.wsocket !== null;
	}
}
export enum MovementDirection {
	DIRECTION1 = 'dir1',
	DIRECTION2 = 'dir2',
	NONE = 'none',
}
export enum GameStatus {
	WAITING = 'waiting', // awaiting all players to join
	RUNNING = 'running',
}
export enum PlayerType {
	USER = 'user',
	AI = 'ai',
	LOCAL = 'local',
}
