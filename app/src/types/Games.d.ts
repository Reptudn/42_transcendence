interface Powerups{
	name: string; // name of the powerup
	probability: number; // probability of this powerup spawning
	duration: number; // duration of the powerup in seconds
}

interface SpeedPowerup extends Powerups {
	speedBoost: number; // how much speed to add
}

interface SizePowerup extends Powerups {
	sizeChange: number; // how much to change the paddle size
}

interface HiddenPowerup extends Powerups {
	hiddenDuration: number; // how long the paddle is hidden
	blikSpeed: number; // speed of the ball when the paddle is hidden
}

interface GameSettings {
	powerupsEnabled: boolean;
	powerups: Powerups[]; // list of powerups available in the game
	map: string; // map name from data/maps/*.json
	playerLives: number; // >= 1
	maxPlayers: number;
	gameDifficulty: number;
}
