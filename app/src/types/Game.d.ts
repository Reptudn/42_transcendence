interface GameSettings {
	players: Array<{
		type: 'user' | 'ai' | 'local';
		id?: number;
		aiLevel?: number;
		aiOrLocalPlayerName?: string;
		localPlayerId?: number;
	}>;
	gameDifficulty: number; // 1 - 10
	powerups: boolean;
	map: string; // map name from data/maps/*.json
	playerLives: number; // >= 1
}
