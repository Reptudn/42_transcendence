declare enum PlayerType {
	USER = 'user',
	AI = 'ai',
	LOCAL = 'local',
}

declare enum GameStatus {
	WAITING = 'waiting', // awaiting all players to join
	RUNNING = 'running',
}

declare interface GameSettings {
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
