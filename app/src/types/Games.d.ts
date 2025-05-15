interface GameSettings {
	gameDifficulty: number; // 1 - 10
	powerups: boolean;
	map: string; // map name from data/maps/*.json
	playerLives: number; // >= 1
}
