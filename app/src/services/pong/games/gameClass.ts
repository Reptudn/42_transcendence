import {
	connectedClients,
	sendSeeMessageByUserId,
	sendSseHtmlByUserId,
	sendSseRawByUserId,
} from '../../sse/handler';
import { getUserTitleString } from '../../database/users';
import { FastifyInstance } from 'fastify';
import { removeGame } from './games';
import ejs from 'ejs';
import { getMapAsInitialGameState } from './rawMapHandler';
import { Player, UserPlayer, AiPlayer, LocalPlayer } from './playerClass';
import { saveCompletedGame } from '../../database/games';
import { GameSettings } from '../../../types/Games';
import { Tournament } from './tournamentClass';

export enum GameStatus {
	WAITING = 'waiting', // awaiting all players to join
	RUNNING = 'running',
	ENDED = 'ended',
}

export enum GameType {
	CLASSIC = 'classic',
	TOURNAMENT = 'tournament',
}

export const defaultGameSettings: GameSettings = {
	gameDifficulty: 5,
	map: 'classic', // if this isnt being changed with the settings this is the default map
	powerupsEnabled: false,
	powerups: [],
	playerLives: 3, // number of lives each player has
	maxPlayers: 4, // max players in a game
	gameType: GameType.CLASSIC,
};

export class Game {
	gameId: number;
	status: GameStatus = GameStatus.WAITING;
	admin: User;
	players: Player[] = [];
	gameState: GameState;
	config: GameSettings;
	results: { playerId: number; place: number }[] = []; // place 1 = died last / won; 1 indexed

	aiBrainData: AIBrainData;
	tournament?: Tournament;

	fastify: FastifyInstance;

	private nextPlayerId: number = 0;
	public alreadyStarted: boolean = false;

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
				size_y: 500,
			},
			objects: [],
		} as GameState;
		this.aiBrainData = {
			aiLastBallDistance: 0,
			aiDelayCounter: 0,
			aiLastTargetParam: 0,
			lastAIMovementDirection: 0,
		} as AIBrainData;
	}

	async addUserPlayer(user: User): Promise<UserPlayer> {
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

		const userPlayer: UserPlayer = new UserPlayer(
			user,
			this,
			null,
			this.nextPlayerId++,
			await getUserTitleString(user.id, this.fastify)
		);
		this.players.push(userPlayer);
		await this.updateLobbyState();
		return userPlayer;
	}

	async addAiPlayer(aiLevel: number): Promise<AiPlayer> {
		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		if (this.players.length >= this.config.maxPlayers)
			throw new Error('Game max player amount already reached!');

		const aiPlayer = new AiPlayer(
			this.nextPlayerId++,
			this,
			aiLevel,
			this.aiBrainData
		);
		aiPlayer.joined = true; // AI players are always considered joined
		this.players.push(aiPlayer);
		await this.updateLobbyState();
		return aiPlayer;
	}

	async addLocalPlayer(owner: UserPlayer): Promise<LocalPlayer> {
		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		if (this.players.length >= this.config.maxPlayers)
			throw new Error('Game max player amount already reached!');

		const localPlayer = new LocalPlayer(this.nextPlayerId++, owner, this);
		localPlayer.joined = true; // Local players are always considered joined
		this.players.push(localPlayer);
		await this.updateLobbyState();
		return localPlayer;
	}

	// TODO: implment logic when a player is leaving while the game is running...
	async removePlayer(playerId: number, forced: boolean = false) {
		const playerToRemove: Player | undefined = this.players.find(
			(player) => player.playerId === playerId
		);
		if (!playerToRemove) throw new Error('Player not found!');

		this.players = this.players.filter((player) => player.playerId !== playerId);
		if (playerToRemove instanceof UserPlayer) {
			playerToRemove.disconnect();

			
			this.players = this.players.filter(
				(player) =>
					!(
						player instanceof LocalPlayer &&
						player.owner.playerId !== playerToRemove.playerId
					)
				);
			this.fastify.log.info(
				`Removed Player ${playerToRemove.user.username}! (And all their LocalPlayers)`
			);

			if (!this.alreadyStarted && this.tournament)
				this.tournament.rebuild(this.players);

			forced &&
				sendSeeMessageByUserId(
					playerToRemove.user.id,
					'game_closed',
					`You got kicked from the game (${this.gameId}).`
				);
		}

		await this.updateLobbyState();

		// TODO: in the future dont end the game when just the owner leaves
		try {
			if (
				playerToRemove instanceof UserPlayer &&
				playerToRemove.user.id == this.admin.id
			)
				this.endGame('Game admin left, game closed.');

			if (this.players.length === 0)
				this.endGame('No players left, game closed.');
		} catch (err) {
			throw err;
		}
	}

	// async onMatchEnd(matchIndex: number, winner: Player) {
	// 	if (!this.tournament) return;

	// 	this.tournament.advance(matchIndex, winner);

	// 	if (this.tournament.isFinished()) {
	// 		const finalMatch = this.tournament.rounds.at(-1)?.[0];
	// 		const champion = finalMatch?.winner;
	// 		// Announce winner, update stats, call this.endGame(), etc.
	// 		this.endGame(`Tournament finished! Winner: ${champion?.displayName}`);
	// 	} else {
	// 		// Start next round
	// 		//const nextMatches = this.tournament.getCurrentMatches();
	// 		// Notify players in nextMatches, update state, etc.
	// 	}
	// 	// Optionally, update the lobby state to show bracket progress
	// 	await this.updateLobbyState();
	// }

	async startGame() {
		if (this.config.gameType === GameType.CLASSIC) {
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
					sendSeeMessageByUserId(
						player.user.id,
						'game_started',
						this.gameId
					);

			this.fastify.log.info(
				`Game ${this.gameId} started with ${this.players.length} players.`
			);
		} else if (this.config.gameType === GameType.TOURNAMENT) {
			if (this.status !== GameStatus.WAITING)
				throw new Error('Game already running!');

			if (this.players.length < 4)
				throw new Error('Not enough players to start the game! (Min 4)');

			for (const player of this.players)
				if (!player.joined)
					throw new Error('All players must be joined to start the game!');

			const { id, id2 } = this.tournament!.getCurrentPlayerId();
			for (let player of this.players) {
				player.spectator = (player.playerId !== id && player.playerId !== id2);
			}

			this.status = GameStatus.RUNNING;
			this.alreadyStarted = true;
			this.gameState = await getMapAsInitialGameState(this);

			for (const player of this.players)
				if (player instanceof UserPlayer)
					sendSeeMessageByUserId(
						player.user.id,
						'game_started',
						this.gameId
					);

			this.fastify.log.info(
				`Game ${this.gameId} started with ${this.players.length} players.`
			);
		}
	}

	// this updates the lobby state for everyone
	async updateLobbyState() {
		if (this.status !== GameStatus.WAITING) return;

		const players = this.players.map((player) => player.formatStateForClients());

		const adminHtml = await ejs.renderFile('./app/pages/lobby_admin.ejs', {
			players: this.players.map((player: Player) => ({
				playerId: player.playerId,
				displayName: player.displayName,
				playerTitle: player.playerTitle,
				joined: player.joined,
				type:
					player instanceof AiPlayer
						? 'AI'
						: player instanceof LocalPlayer
						? 'Local'
						: 'User',
				aiDifficulty:
					player instanceof AiPlayer ? player.aiDifficulty : undefined, // Make sure this is included
			})),
			gameSettings: this.config,
			initial: false,
			ownerName: this.admin.displayname,
			tournament: this.tournament,
			localPlayerId:
				this.players.find(
					(p) =>
						p instanceof LocalPlayer && p.owner.user.id === this.admin.id
				)?.playerId || -1,
			tournamentTree: this.tournament ? this.tournament.getBracketJSON() : null,
		});

		for (const player of this.players) {
			if (!(player instanceof UserPlayer) || !player.joined) continue;

			if (player.user.id === this.admin.id)
				sendSseHtmlByUserId(
					player.user.id,
					'lobby_admin_settings_update',
					adminHtml
				);
			else {
				const lobbyHtml = await ejs.renderFile('./app/pages/lobby.ejs', {
					players: players,
					gameSettings: this.config,
					initial: false,
					ownerName: this.admin.displayname,
					selfId: player.playerId,
					localPlayerId:
						this.players.find(
							(p) =>
								p instanceof LocalPlayer &&
								p.owner.user.id === player.user.id
						)?.playerId || -1,
					tournamentTree: this.tournament ? this.tournament.getBracketJSON() : null,
				});
				sendSseHtmlByUserId(
					player.user.id,
					'game_settings_update',
					lobbyHtml
				);
			}
		}
	}

	// when null if given it means the game end because no players were left
	async endGame(end_message: string, winner: Player | null = null) {
		this.fastify.log.info(
			`Ending game ${this.gameId} with message: ${end_message}`
		);

		this.status = GameStatus.WAITING;
		
		if (this.config.gameType === GameType.TOURNAMENT && this.tournament && winner)
		{
			this.tournament.advance(winner);
			if (this.tournament.isFinished())
			{
				this.fastify.log.info('tournament finished');
				// (async () => {
				// 	try {
				// 		await saveCompletedTournamentGame(this, this.fastify);
				// 	} catch (_e) {
				// 		// already logged inside saveCompletedGame
				// 	}
				// })();
		
				// this occurs when the game ends because its actually over because someone won or the admin left as of now
				for (const player of this.players) {
					if (!(player instanceof UserPlayer)) continue;
					player.disconnect();
					sendSeeMessageByUserId(player.user.id, 'game_closed', `Tournament ended,<br>Winner: ${this.tournament.getWinner()?.displayName || 'Unknown'}`);
				}
		
				removeGame(this.gameId);
				return;
			}
			this.fastify.log.info('tournament advancing');

			for (const player of this.players) {
				player.lives = this.config.playerLives;
				if (!(player instanceof UserPlayer)) continue;
				sendSseRawByUserId(
					player.user.id,
					`data: ${JSON.stringify({
						type: this.admin.id === player.user.id ? 'game_tournament_admin_lobby_warp' : 'game_tournament_lobby_warp',
						gameId: this.gameId,
					})}\n\n`
				);
			}
		}
		else
		{
			(async () => {
				try {
					await saveCompletedGame(this, this.fastify);
				} catch (_e) {
					// already logged inside saveCompletedGame
				}
			})();
	
			// this occurs when the game ends because its actually over because someone won or the admin left as of now
			for (const player of this.players) {
				if (!(player instanceof UserPlayer)) continue;
				player.disconnect();
				sendSeeMessageByUserId(player.user.id, 'game_closed', end_message);
			}
	
			removeGame(this.gameId);
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

	formatStateForClients() {
		return {
			...this.gameState,
			players: this.players.filter((player) => !player.spectator).map((player) => player.formatStateForClients()),
		};
	}
}
