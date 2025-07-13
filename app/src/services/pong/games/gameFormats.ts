import type { WebSocket as WSWebSocket } from 'ws';
import { connectedClients } from '../../sse/handler';

export enum GameStatus {
	WAITING = 'waiting', // awaiting all players to join
	RUNNING = 'running',
}

export enum PlayerType {
	USER = 'user',
	AI = 'ai',
	LOCAL = 'local',
	SPECTATOR = 'spectator',
}

const defaultGameSettings: GameSettings = {
	map: 'default_map',
	playerLives: 3,
	gameDifficulty: 1,
	powerups: true,
	maxPlayers: 4, // max players in a game
	players: [{
		type: PlayerType.USER,
		id: -1,
	}], // at least one player as required by the type
};

export class Game {
	gameId: number;
	status: GameStatus = GameStatus.WAITING;
	admin: User;
	players: Player[] = [];
	// gameState: GameState = {};
	gameSettings: GameSettings;

	constructor(
		gameId: number,
		admin: User,
		gameSettings: GameSettings = defaultGameSettings,
	) {
		this.gameId = gameId;
		this.admin = admin;
		this.status = GameStatus.WAITING;
		this.gameSettings = gameSettings;
		// push admin as first player
	}

	updateGameSettings(gameSettings: GameSettings) {
		if (this.status !== GameStatus.WAITING) return;

		this.gameSettings = gameSettings;

		for (const player of this.players) {
			const id = player.userId;
			if (!id) continue;

			connectedClients.get(id)?.send(
				JSON.stringify({
					type: 'game_settings_update',
					gameId: this.gameId,
					gameSettings: this.gameSettings,
				})
			);
		}
	}

	addPlayer(player: Player) {
		if (this.status !== GameStatus.WAITING) return;

		player.playerId = this.players.length;
		this.players.push(player);

		if (
			player.userId &&
			player.type === PlayerType.USER &&
			player.userId !== this.admin.id &&
			connectedClients.has(player.userId)
		) {
			connectedClients.get(player.userId)?.send(
				JSON.stringify({
					type: 'game_request',
					gameId: this.gameId,
					playerId: player.playerId,
				})
			);
		}
	}

	isReady() {
		for (const player of this.players) {
			if (!player.isReady(this)) {
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
	wsocket: WSWebSocket | null;
	userId: number | null;
	username: string | null;
	displayName: string | null;
	playerTitle: string | null;

	// PlayerType.AI
	aiLevel: number | null;
	aiName: string | null;
	aiBrainData: AIBrainData | null;

	// PlayerType.LOCAL
	// for local players, userId saves admin user id
	localPlayerId: number | null;
	localPlayerName: string | null;

	// live game data
	lives = 3;
	movementDirection: number = 0; // -1 | 0 | 1
	// aiMoveCoolDown: number = aiLevel;

	joined: boolean = false; // true if player has joined the game, false if they are still waiting for the game to start

	constructor(
		type: PlayerType,
		playerId: number,
		lives: number,
		userId: number | null = null,
		wsocket: WSWebSocket | null = null,
		aiLevel: number | null = null,
		localPlayerId: number | null = null,
		username: string | null = null,
		displayName: string | null = null,
		playerTitle: string | null = null,
		aiName: string | null = null,
		localPlayerName: string | null = null
	) {
		this.type = type;
		this.playerId = playerId;
		this.lives = lives;
		this.userId = userId;
		this.wsocket = wsocket;
		this.aiLevel = aiLevel;
		this.aiBrainData = null;
		this.localPlayerId = localPlayerId;
		this.username = username;
		this.displayName = displayName;
		this.playerTitle = playerTitle;
		this.aiName = aiName;
		this.localPlayerName = localPlayerName;
	}

	isReady(game: Game) {

		if (!this.joined) return false;

		if (this.type === PlayerType.SPECTATOR) {
			return true; // spectators are always ready
		}

		switch (this.type) {
			case PlayerType.USER:
				return this.wsocket !== null;

			case PlayerType.AI:
				return true;

			case PlayerType.LOCAL: {
				const adminPlayer = game.players.find(
					(player) => player.userId === this.userId
				);

				return adminPlayer?.wsocket !== null;
			}
		}
	}
}
export interface AIBrainData {
	aiLastBallDistance: number;
	aiDelayCounter: number;
	aiLastTargetParam: number;
	lastAIMovementDirection: number;
}
