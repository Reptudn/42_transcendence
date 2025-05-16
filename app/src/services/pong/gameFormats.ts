import { GameState } from './engine/engineFormats';
import type { Player } from './player';
import { UserPlayer } from './player';

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

	constructor(gameId: number, admin: User) {
		this.gameId = gameId;
		this.status = GameStatus.WAITING;
		this.gameState = null;
		this.gameSettings = null;

		this.players = [];
		const adminPlayer = new UserPlayer(this.players.length, admin.id);
		this.players.push(adminPlayer);
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
