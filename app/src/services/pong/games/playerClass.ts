import { Game } from './gameClass';
// import { getRandomUserTitle } from '../../database/users';
import { WebSocket as WSWebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';

const defaultBotNames = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, '../../../../data/defaultBotNames.json'),
		'utf-8'
	)
);

function getRandomDefaultName(): string {
	return defaultBotNames[Math.floor(Math.random() * defaultBotNames.length)];
}

export abstract class Player {
	public playerId: number; // unique within a game, not to be confused with user id system

	public displayName: string;
	public playerTitle: string;

	public lives = 3;
	public movementDirection: number = 0; // -1 | 0 | 1

	public joined: boolean = false; // true if player has joined the game, false if they are still waiting for the game to start

	constructor(
		playerId: number,
		lives: number,
		displayName: string,
		playerTitle: string
	) {
		this.playerId = playerId;
		this.lives = lives;
		this.displayName = displayName;
		this.playerTitle = playerTitle;
	}

	abstract isReady(): boolean;

	formatStateForClients() {
		return {
			playerId: this.playerId,
			displayName: this.displayName,
			playerTitle: this.playerTitle,
			lives: this.lives,
			joined: this.joined,
			type:
				this instanceof UserPlayer
					? 'User'
					: this instanceof LocalPlayer
					? 'Local'
					: this instanceof AiPlayer
					? 'AI'
					: 'Unknown',
		};
	}
}

export class UserPlayer extends Player {
	public user: User;
	public wsocket: WSWebSocket | null;

	constructor(
		user: User,
		game: Game,
		wsocket: WSWebSocket | null,
		id: number,
		playerTitle: string
	) {
		super(id, game.config.playerLives, user.displayname, playerTitle);
		this.user = user;
		this.wsocket = wsocket;
	}

	isReady(): boolean {
		return (
			this.wsocket !== null &&
			this.wsocket.readyState === WSWebSocket.OPEN &&
			this.joined
		);
	}

	disconnect() {
		this.wsocket?.close();
		this.wsocket = null;
		this.joined = false;
	}
}

export class AiPlayer extends Player {
	public aiMoveCoolDown: number;
	public aiBrainData: AIBrainData;
	public aiDifficulty: number;

	constructor(id: number, game: Game, aiLevel: number, aiBrainData: AIBrainData) {
		super(id, game.config.playerLives, `${getRandomDefaultName()}`, 'AI Level 3');
		this.aiMoveCoolDown = aiLevel;
		this.aiBrainData = aiBrainData;
		this.aiDifficulty = 3;
	}

	setName(name: string) {
		this.displayName = `${name} (AI)`;
	}

	get difficulty() { return this.aiDifficulty; }

	setDifficulty(difficulty: number) {
		if (difficulty < 1 && difficulty > 10)
			return;
		this.aiDifficulty = difficulty;
		this.playerTitle = `AI Level ${difficulty}`;
	}

	isReady(): boolean {
		return true;
	}
}

export class LocalPlayer extends Player {
	owner: UserPlayer; // the actual user that created this local player

	// TODO: better way to handle local player with custom names
	constructor(id: number, owner: UserPlayer, game: Game) {
		super(
			id,
			game.config.playerLives,
			`${owner.displayName} (Local)`,
			`Local from ${owner.displayName}`
		);
		this.owner = owner;
	}

	// TODO: protect name change better
	setName(name: string) {
		if (name.length > 16) return;
		this.displayName = `${name} (Local)`;
		this.playerTitle = `Local from ${this.owner.displayName}`;
	}

	isReady(): boolean {
		return this.owner.isReady();
	}
}
