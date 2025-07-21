import { WebSocket as WSWebSocket } from 'ws';
import { connectedClients, sendSeeMessageByUserId, sendSseHtmlByUserId, sendSseRawByUserId } from '../../sse/handler';
import { getUserTitleString } from '../../database/users';
import { FastifyInstance } from 'fastify';
import { removeGame } from './games';
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

	// TODO: implment logic when a player is leaving while the game is running...
	async removePlayer(playerId: number, forced: boolean = false) {
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
					!(player instanceof LocalPlayer &&
					player.owner.playerId !== playerToRemove.playerId)
			);
			this.fastify.log.info(
				`Removed Player ${playerToRemove.user.username}! (And all their LocalPlayers)`
			);
			forced && sendSeeMessageByUserId(playerToRemove.user.id, 'game_closed', `You got kicked from the game (${this.gameId}).`);
		}

		await this.updateLobbyState();

		// TODO: in the future dont end the game when just the owner leaves
		try
		{
			if (playerToRemove instanceof UserPlayer && playerToRemove.user.id == this.admin.id)
				this.endGame('Game admin left, game closed.');
	
			if (this.players.length === 0)
				this.endGame(null);
		}
		catch (err)
		{
			throw err;
		}

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

		const adminHtml = await ejs.renderFile('./app/public/pages/game_setup.ejs', {
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

	// when null if given it means the game end because no players were left
	endGame(end_message: string | null)
	{
		if (end_message !== null) // this occurs when the game ends because its actually over because someone won or the admin left as of now
		{
			for (const player of this.players) {
				if (!(player instanceof UserPlayer)) continue;
				player.disconnect();
				sendSseRawByUserId(player.user.id, JSON.stringify({
					type: 'game_closed',
					message: end_message,
				}));
			}
			this.players.splice(0, this.players.length); // clear all players
	
			// TODO: add some game ending logic like adding everything to the db and such
		}
		
		removeGame(this.gameId);
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
