import { WebSocket as WSWebSocket } from 'ws';
import { connectedClients, sendSseRawByUserId } from '../../sse/handler';
import { getUserTitleString } from '../../database/users';
import { FastifyInstance } from 'fastify';
import { runningGames } from './games';
import ejs from 'ejs';

export enum GameStatus {
	WAITING = 'waiting', // awaiting all players to join
	RUNNING = 'running',
}

const defaultGameSettings: GameSettings = {
	map: 'default_map',
	powerupsEnabled: false,
	powerups: [],
	playerLives: 3, // number of lives each player has
	maxPlayers: 4, // max players in a game
};

export class Game {
	gameId: number;
	status: GameStatus = GameStatus.WAITING;
	admin: User;
	players: Player[] = [];
	// gameState: GameState = {};
	config: GameSettings;

	fastify: FastifyInstance;

	constructor(
		gameId: number,
		admin: User,
		fastify: FastifyInstance,
		config: GameSettings = defaultGameSettings
	) {
		this.gameId = gameId;
		this.admin = admin;
		this.status = GameStatus.WAITING;
		this.fastify = fastify;
		this.config = config;
		this.players = [];
		// this.players.push(new UserPlayer(admin, this, null, 0, "User Player"));
	}

	async addUserPlayer(user: User) {
		if (!connectedClients.get(user.id))
			throw new Error("Can't invite a user which is offline!");

		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		if (this.players.length >= this.config.maxPlayers)
			throw new Error('Game max player amount already reached!');

		if (
			this.players.find(
				(player) =>
					player instanceof UserPlayer && player.user.id === user.id
			)
		)
			throw new Error(`${user.displayname} already in this game!`);

		this.players.push(
			new UserPlayer(
				user,
				this,
				null,
				this.players.length + 1,
				await getUserTitleString(user.id, this.fastify)
			)
		);
		this.updatePlayers();
	}

	async addAiPlayer(name: string, aiLevel: number) {
		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		if (this.players.length >= this.config.maxPlayers)
			throw new Error('Game max player amount already reached!');

		this.players.push(
			new AiPlayer(this.players.length + 1, this, name, 'AI', aiLevel)
		);
		this.updatePlayers();
	}

	addLocalPlayer(owner: UserPlayer) {
		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		if (this.players.length >= this.config.maxPlayers)
			throw new Error('Game max player amount already reached!');

		this.players.push(
			new LocalPlayer(this.players.length + 1, owner, this)
		);
		this.updatePlayers();
	}

	removePlayer(playerId: number) {
		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		const playerToRemove: Player | undefined = this.players.find(
			(player) => player.playerId === playerId
		);
		if (!playerToRemove) throw new Error('Player not found!');

		this.players = this.players.filter(
			(player) => player.playerId !== playerId
		);
		if (playerToRemove instanceof UserPlayer) {
			playerToRemove.disconnect();
			this.players = this.players.filter(
				(player) =>
					player instanceof LocalPlayer &&
					player.owner === playerToRemove
			);
			this.fastify.log.info(
				`Removed Player ${playerToRemove.user.username}! (And all their LocalPlayers)`
			);
		}

		if (playerToRemove instanceof UserPlayer && playerToRemove.user.id == this.admin.id) {
			for (const player of this.players) {
				if (!(player instanceof UserPlayer)) continue;
				player.disconnect();
				sendSseRawByUserId(player.user.id, JSON.stringify({
					type: 'game_closed',
					message: 'Game admin left, game closed.',
				}));
			}
			this.players.splice(0, this.players.length); // clear all players
		}

		if (this.players.length === 0) {
			const index = runningGames.findIndex(
				(game) => game.gameId === this.gameId
			);
			if (index !== -1) runningGames.splice(index, 1);
			this.fastify.log.info(
				`Deleted Game ${this.gameId} because no players are left!`
			);
		}
	}

	private updatePlayers() {

		// const adminHtml = ejs.render('game_setup', {
		// 	players: this.players,
		// 	gameSettings: this.config,
		// 	initial: false,
		// });

		const lobbyHtml = ejs.render('lobby', {
			players: this.players,
			gameSettings: this.config,
			initial: false,
		});

		for (const player of this.players) {
			if (!(player instanceof UserPlayer)) continue;

			if (player.user.id === this.admin.id) continue;
				// sendSseRawByUserId(player.user.id, JSON.stringify({
				// 	type: 'game_setup_settings_update',
				// 	html: adminHtml
				// }));
			else
				sendSseRawByUserId(player.user.id, JSON.stringify({
					type: 'game_settings_update',
					html: lobbyHtml
				}));
		}
	}

	updateGameSettings(gameSettings: GameSettings) {
		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		const adminHtml = ejs.render('game_setup', {
			players: this.players,
			gameSettings: gameSettings,
			initial: false,
		});

		const lobbyHtml = ejs.render('lobby', {
			players: this.players,
			gameSettings: this.config,
			initial: false,
		});

		this.config = gameSettings;

		for (const player of this.players) {
			if (!(player instanceof UserPlayer)) continue;

			if (player.user.id === this.admin.id)
				sendSseRawByUserId(player.user.id, JSON.stringify({
					type: 'game_settings_update',
					html: adminHtml
				}));
			else
				sendSseRawByUserId(player.user.id, JSON.stringify({
					type: 'game_settings_update',
					html: lobbyHtml
				}));
		}
	}

	// addPlayer(player: Player) {
	// 	if (this.status !== GameStatus.WAITING) return;

	// 	player.playerId = this.players.length;
	// 	this.players.push(player);

	// 	if (
	// 		player.userId &&
	// 		player.type === PlayerType.USER &&
	// 		player.userId !== this.admin.id &&
	// 		connectedClients.has(player.userId)
	// 	) {
	// 		connectedClients.get(player.userId)?.send(
	// 			JSON.stringify({
	// 				type: 'game_request',
	// 				gameId: this.gameId,
	// 				playerId: player.playerId,
	// 			})
	// 		);
	// 	}
	// }

	isReady() {
		for (const player of this.players) {
			if (!player.isReady()) {
				return false;
			}
		}
		return true;
	}
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
			this.wsocket.readyState === WSWebSocket.OPEN
		);
	}

	disconnect() {
		this.wsocket?.close();
	}
}

export class AiPlayer extends Player {
	public aiMoveCoolDown: number;
	// data: AIBrainData;

	constructor(
		id: number,
		game: Game,
		name: string,
		title: string,
		aiLevel: number
	) {
		super(id, game.config.playerLives, name, title);
		this.aiMoveCoolDown = aiLevel;
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
			'Local'
		);
		this.owner = owner;
	}

	isReady(): boolean {
		return this.owner.isReady();
	}
}

export interface AIBrainData {
	aiLastBallDistance: number;
	aiDelayCounter: number;
	aiLastTargetParam: number;
	lastAIMovementDirection: number;
}
