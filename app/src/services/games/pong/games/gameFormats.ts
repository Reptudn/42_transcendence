import { GameState } from '../engine/engineFormats';
import { Player } from './playerClass';

export enum GameStatus {
	WAITING = 'waiting',
	RUNNING = 'running',
}

export class Game {
	gameId: number;
	status: GameStatus;
	players: Player[];
	gameState: GameState | null;
	gameSettings: GameSettings | null;

	constructor(gameId: number, admin: Player) {
		this.gameId = gameId;
		this.status = GameStatus.WAITING;
		this.players = [];
		this.players.push(admin);
		this.gameState = null;
		this.gameSettings = null;
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
