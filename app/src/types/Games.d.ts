interface GameSettings {
	powerupsEnabled: boolean;
	map: string; // map name from data/maps/*.json
	playerLives: number; // >= 1
	maxPlayers: number;
	gameDifficulty: number;
}
