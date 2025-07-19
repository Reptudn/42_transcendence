import { WebSocket as WSWebSocket } from 'ws';
import { connectedClients, sendSeeMessageByUserId, sendSseHtmlByUserId, sendSseRawByUserId } from '../../sse/handler';
import { getUserTitleString } from '../../database/users';
import { FastifyInstance } from 'fastify';
import { runningGames } from './games';
import ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import { getMapAsInitialGameState } from './rawMapHandler';

export enum GameStatus {
	WAITING = 'waiting', // awaiting all players to join
	RUNNING = 'running',
}

const defaultBotNames = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, '../../../../data/defaultBotNames.json'),
		'utf-8'
	)
);

function getRandomDefaultName(): string {
	return defaultBotNames[Math.floor(Math.random() * defaultBotNames.length)];
}

const defaultGameSettings: GameSettings = {
	gameDifficulty: 5,
	map: 'classic', // if this isnt being changed with the settings this is the default map
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
	gameState: GameState;
	config: GameSettings;

	fastify: FastifyInstance;

	// TODO: include start time to close the game after some time when it has started and no websocket connected

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
		this.gameState = {
			meta: {
				name: 'test',
				author: 'freddy',
				size_x: 500,
				size_y: 500
			},
			objects: []
		} as GameState;
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
		await this.updateLobbyState();
	}

	async addAiPlayer(name: string, aiLevel: number) {
		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		if (this.players.length >= this.config.maxPlayers)
			throw new Error('Game max player amount already reached!');

		const aiPlayer = new AiPlayer(this.players.length + 1, this, name, 'AI', aiLevel);
		aiPlayer.joined = true; // AI players are always considered joined
		this.players.push(aiPlayer);
		await this.updateLobbyState();
	}

	async addLocalPlayer(owner: UserPlayer) {
		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		if (this.players.length >= this.config.maxPlayers)
			throw new Error('Game max player amount already reached!');

		const localPlayer = new LocalPlayer(this.players.length + 1, owner, this);
		localPlayer.joined = true; // Local players are always considered joined
		this.players.push(localPlayer);
		await this.updateLobbyState();
	}

	async removePlayer(playerId: number) {
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
					player.owner !== playerToRemove
			);
			this.fastify.log.info(
				`Removed Player ${playerToRemove.user.username}! (And all their LocalPlayers)`
			);
			sendSseRawByUserId(playerToRemove.user.id, JSON.stringify({
				type: 'game_closed',
				message: `You got kicked from the game (${this.gameId}).`,
			}));
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
		await this.updateLobbyState();
	}

	async startGame()
	{
		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		if (this.players.length < 2)
			throw new Error('Not enough players to start the game! (Min 2)');

		for (const player of this.players)
			if (!player.joined)
				throw new Error('All players must be joined to start the game!');

		this.status = GameStatus.RUNNING;
		this.gameState = await getMapAsInitialGameState(this);

		for (const player of this.players)
			if (player instanceof UserPlayer)
				sendSeeMessageByUserId(player.user.id, 'game_started', this.gameId);

		this.fastify.log.info(`Game ${this.gameId} started with ${this.players.length} players.`);
	}

	// this updates the lobby state for everyone
	async updateLobbyState() {

		const adminHtml = await ejs.renderFile('./app/public/pages/game_setup_new.ejs', {
			players: this.players,
			gameSettings: this.config,
			initial: false,
			ownerName: this.admin.displayname,
		});

		const lobbyHtml = await ejs.renderFile('./app/public/pages/lobby.ejs', {
			players: this.players,
			gameSettings: this.config,
			initial: false,
			ownerName: this.admin.displayname
		});

		for (const player of this.players) {
			if (!(player instanceof UserPlayer) || !player.joined) continue;

			if (player.user.id === this.admin.id)
				sendSseHtmlByUserId(player.user.id, 'game_setup_settings_update', adminHtml);
			else
				sendSseHtmlByUserId(player.user.id, 'game_settings_update', lobbyHtml);
		}
	}

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

	constructor(
		id: number,
		game: Game,
		name: string,
		title: string,
		aiLevel: number
	) {
		// probably temp random ai names
		name = getRandomDefaultName();
		super(id, game.config.playerLives, name, title);
		this.aiMoveCoolDown = aiLevel;
		this.aiBrainData = {
			aiLastBallDistance: 0,
			aiDelayCounter: 0,
			aiLastTargetParam: 0,
			lastAIMovementDirection: 0,
		} as AIBrainData;
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
