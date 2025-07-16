// import type { WebSocket as WSWebSocket } from 'ws';
// import { PlayerType, GameStatus } from './gameFormats';

// export class Game {
// 	gameId: number;
// 	status: GameStatus;
// 	players: Player[];
// 	gameState: GameState;
// 	powerups: boolean;

// 	constructor(
// 		gameId: number,
// 		players: Player[],
// 		gameSettings: GameSettings,
// 		gameState: GameState
// 	) {
// 		this.gameId = gameId;
// 		this.status = GameStatus.WAITING;
// 		this.players = players;
// 		this.gameState = gameState;
// 		console.log(this.gameState);
// 		this.powerups = gameSettings.powerups;
// 	}

// 	isReady() {
// 		for (const player of this.players) {
// 			if (!player.isReady()) {
// 				return false;
// 			}
// 		}
// 		return true;
// 	}
// }

// export class Player {
// 	type: PlayerType;
// 	playerId: number; // unique within a game, not to be confused with user id system

// 	// PlayerType.USER
// 	wsocket: WSWebSocket | null;
// 	userId: number | null;
// 	username: string | null;
// 	displayName: string | null;
// 	playerTitle: string | null;

// 	// PlayerType.AI
// 	aiLevel: number | null;
// 	aiName: string | null;
// 	aiBrainData: any;

// 	// PlayerType.LOCAL
// 	// for local players, userId saves admin user id
// 	localPlayerId: number | null;
// 	localPlayerName: string | null;

// 	// live game data
// 	lives = 3;
// 	movementDirection: number = 0; // -1 | 0 | 1
// 	// aiMoveCoolDown: number = aiLevel;

// 	constructor(
// 		type: PlayerType,
// 		playerId: number,
// 		lives: number,
// 		userId: number | null = null,
// 		wsocket: WSWebSocket | null = null,
// 		aiLevel: number | null = null,
// 		localPlayerId: number | null = null,
// 		username: string | null = null,
// 		displayName: string | null = null,
// 		playerTitle: string | null = null,
// 		aiName: string | null = null,
// 		localPlayerName: string | null = null
// 	) {
// 		this.type = type;
// 		this.playerId = playerId;
// 		this.lives = lives;
// 		this.userId = userId;
// 		this.wsocket = wsocket;
// 		this.aiLevel = aiLevel;
// 		this.localPlayerId = localPlayerId;
// 		this.username = username;
// 		this.displayName = displayName;
// 		this.playerTitle = playerTitle;
// 		this.aiName = aiName;
// 		this.localPlayerName = localPlayerName;
// 	}

// 	isReady() {
// 		return this.wsocket !== null;
// 	}
// }
Moi;
