import type { GameType } from '../services/pong/games/gameClass';

interface GameSettings {
	powerupsEnabled: boolean;
	map: string; // map name from data/maps/*.json
	playerLives: number; // >= 1
	maxPlayers: number;
	gameDifficulty: number;
	gameType: GameType;
	autoAdvance: boolean; //wether to auto advance when two bots are playing against each other in a bot match
}
