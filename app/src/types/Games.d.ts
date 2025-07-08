interface GameSettings {
	players:
		| [
				// 0 - 3
				{
					type: PlayerType;
					id: number;
					aiLevel?: number;
					localPlayerId?: number;
					aiOrLocalPlayerName?: string;
				}
		  ]
		| null; // null if no players are set
	gameDifficulty: number; // 1 - 10
	powerups: boolean;
	map: string; // map name from data/maps/*.json
	playerLives: number; // >= 1
	maxPlayers: number;
}
