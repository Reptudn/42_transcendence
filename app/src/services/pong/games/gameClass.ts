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
import { getAvailableMaps, getMapAsInitialGameState } from './rawMapHandler';
import { Player, UserPlayer, AiPlayer, LocalPlayer } from './playerClass';
import { saveCompletedGame } from '../../database/games';
import { GameSettings } from '../../../types/Games';
import { sendPopupToClient } from '../../sse/popup';
import { Tournament } from './tournamentClass';
import i18next from 'i18next';

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
	powerupsEnabled: true,
	playerLives: 3, // number of lives each player has
	maxPlayers: 4, // max players in a game
	gameType: GameType.CLASSIC,
	autoAdvance: true,
};

export enum PowerupType {
	InverseControls = 'INVERSE_CONTROLS',
	Redirection = 'REDIRECTION',
	Nausea = 'NAUSEA',
	WonkyBall = 'WONKY_BALL',
	PhasingPaddle = 'PHASING_PADDLE',
	PhasingBall = 'PHASING_BALL',
	BallSplosion = 'BALLSPLOSION',
	SpeedUp = 'SPEED_UP',
}

export const powerupCheckDelay = 2000;
export const powerupSpawnChance = 0.5;
export const powerupDuration = 10000;
export const powerupObjectRadius = 3;

export class Game {
	gameId: number;
	status: GameStatus = GameStatus.WAITING;
	admin: User;
	players: Player[] = [];
	gameState: GameState;
	config: GameSettings;
	ended: boolean = false;

	ballSpeed = 3;

	results: { playerId: number; place: number }[] = []; // place 1 = died last / won; 1 indexed

	activePowerups: PowerupInstance[] = [];
	nextPowerupCheckAt: number = Date.now() + powerupCheckDelay;

	availableMaps: string[] | null = null;

	aiBrainData: AIBrainData;
	tournament?: Tournament;

	fastify: FastifyInstance;

	// private nextPlayerId: number = 0;
	public alreadyStarted = false;
	public lastLobbyUpdate: number = Date.now();

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
		this.config = { ...config };
		this.players = [];
		this.config = defaultGameSettings;
		this.config.gameType = GameType.CLASSIC; // default game type is classic
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
			intendedPercent: 50,
			nextRecalcAt: Date.now(),
		} as AIBrainData;
		this.activePowerups = [];
		this.nextPowerupCheckAt = Date.now() + powerupCheckDelay;
	}

	private getNextAvailablePlayerId(): number {
		const usedIds = new Set<number>(this.players.map((p) => p.playerId));
		for (let i = 0; i <= this.players.length; i++) if (!usedIds.has(i)) return i;

		const maxId = this.players.reduce((max, p) => Math.max(max, p.playerId), -1);
		return maxId + 1;
	}

	private shufflePlayerIds(): void {
		if (this.players.length <= 1) return;

		const adminPlayer = this.players[0];
		const otherPlayers = this.players.slice(1);

		for (let i = otherPlayers.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[otherPlayers[i], otherPlayers[j]] = [otherPlayers[j], otherPlayers[i]];
		}

		adminPlayer.playerId = 0;
		otherPlayers.forEach((player, idx) => {
			player.playerId = idx + 1;
		});
		this.players = [adminPlayer, ...otherPlayers];
	}

	async addUserPlayer(user: User, silent = false): Promise<UserPlayer> {
		if (!this.availableMaps)
			this.availableMaps = await getAvailableMaps(this.fastify);

		if (this.alreadyStarted)
			throw new Error(
				'Cant add a user when the first tournament round has been played already'
			);

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
			this.getNextAvailablePlayerId(),
			await getUserTitleString(user.id, this.fastify)
		);
		this.players.push(userPlayer);

		if (this.config.gameType === GameType.TOURNAMENT && this.tournament) {
			this.tournament.rebuild(this.players);
		}

		if (!silent) await this.updateLobbyState();
		return userPlayer;
	}

	async addAiPlayer(aiLevel: number, silent = false): Promise<AiPlayer> {
		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		if (this.players.length >= this.config.maxPlayers)
			throw new Error('Game max player amount already reached!');

		const aiPlayer = new AiPlayer(
			this.getNextAvailablePlayerId(),
			this,
			aiLevel,
			{ intendedPercent: 0.5, nextRecalcAt: 0 } as AIBrainData
		);
		aiPlayer.joined = true; // AI players are always considered joined
		this.players.push(aiPlayer);
		if (!silent) await this.updateLobbyState();
		return aiPlayer;
	}

	async addLocalPlayer(owner: UserPlayer, silent = false): Promise<LocalPlayer> {
		if (this.status !== GameStatus.WAITING)
			throw new Error('Game already running!');

		if (this.alreadyStarted)
			throw new Error(
				'Cant add a user when the first tournament round has been played already'
			);

		if (this.players.length >= this.config.maxPlayers)
			throw new Error('Game max player amount already reached!');

		const localPlayer = new LocalPlayer(
			this.getNextAvailablePlayerId(),
			owner,
			this
		);
		localPlayer.joined = true; // Local players are always considered joined
		this.players.push(localPlayer);
		if (this.config.gameType === GameType.TOURNAMENT && this.tournament) {
			this.tournament.rebuild(this.players);
		}
		if (!silent) await this.updateLobbyState();
		return localPlayer;
	}

	async removePlayer(
		playerId: number,
		forced: boolean = false,
		silent: boolean = false,
		skipAutoRefill = false
	) {
		const playerToRemove: Player | undefined = this.players.find(
			(player) => player.playerId === playerId
		);
		if (!playerToRemove) return;

		if (forced && this.alreadyStarted)
			throw new Error(
				'Cant add a user when the first tournament round has been played already'
			);

		this.players = this.players.filter((player) => player.playerId !== playerId);
		if (this.status === GameStatus.RUNNING) {
			this.gameState.objects = this.gameState.objects.filter(
				(o) => o.playerNbr !== playerId
			);
			for (const player of this.players) {
				if (
					player instanceof LocalPlayer &&
					player.owner.playerId === playerId
				) {
					this.gameState.objects = this.gameState.objects.filter(
						(o) => o.playerNbr !== player.playerId
					);
				}
			}
		}
		if (playerToRemove instanceof UserPlayer) {
			playerToRemove.disconnect("Player removed");
			playerToRemove.joined = false;

			this.players = this.players.filter(
				(player) =>
					!(
						player instanceof LocalPlayer &&
						player.owner.playerId === playerToRemove.playerId
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

		if (
			this.config.gameType === GameType.TOURNAMENT &&
			this.tournament &&
			!this.alreadyStarted &&
			!skipAutoRefill
		) {
			for (let i = this.players.length; i < this.config.maxPlayers; i++)
				this.addAiPlayer(this.config.gameDifficulty, true);
			this.tournament.rebuild(this.players);
		}

		if (!silent) await this.updateLobbyState();

		// TODO: in the future dont end the game when just the owner leaves
		try {
			if (
				playerToRemove instanceof UserPlayer &&
				playerToRemove.user.id == this.admin.id &&
				this.ended === false
			)
				this.endGame(
					'Game admin left, game closed. (Game doesnt count)',
					playerToRemove,
					false
				);

			if (this.players.length === 0)
				this.endGame('No players left, game closed.', playerToRemove, false);
		} catch (err) {
			throw err;
		}
	}

	async startGame() {
		for (const player of this.players) {
			if (!(player instanceof UserPlayer)) continue;

			if (connectedClients.get(player.user.id) === undefined)
				throw new Error('Not all users are connected to SSE');
		}

		this.shufflePlayerIds();

		if (this.config.gameType === GameType.CLASSIC) {
			if (this.status !== GameStatus.WAITING)
				throw new Error('Game already running!');

			if (this.players.length < 2)
				throw new Error('Not enough players to start the game! (Min 2)');

			if (this.players.length > 4){
				throw new Error('Too much players! (Max 4)');
			}

			for (const player of this.players)
				if (!player.joined)
					throw new Error('All players must be joined to start the game!');

			this.gameState = await getMapAsInitialGameState(this);

			for (const player of this.players)
				if (player instanceof UserPlayer)
					sendSeeMessageByUserId(
						player.user.id,
						'game_started',
						this.gameId
					);

			this.status = GameStatus.RUNNING;
			this.fastify.log.info(
				`Game ${this.gameId} started with ${this.players.length} players.`
			);
		} else if (this.config.gameType === GameType.TOURNAMENT) {
			if (this.status !== GameStatus.WAITING)
				throw new Error('Game already running!');
			if (this.players.length < 8) {
				this.status = GameStatus.WAITING;
				this.ended = true;
				this.endGame('Tournament closed because a Player left!');
				throw new Error('Tournament closed!');
			}

			for (const player of this.players)
				if (!player.joined)
					throw new Error('All players must be joined to start the game!');

			const { id, id2 } = this.tournament!.getCurrentPlayerId();
			for (let player of this.players) {
				player.spectator = player.playerId !== id && player.playerId !== id2;
				player.lives = player.spectator ? 0 : this.config.playerLives;
			}

			this.aiBrainData = {
				intendedPercent: 50,
				nextRecalcAt: Date.now(),
			} as AIBrainData;
			this.results = [];
			this.activePowerups = [];
			this.alreadyStarted = true;
			this.gameState = await getMapAsInitialGameState(this);

			for (const player of this.players) {
				if (player instanceof UserPlayer)
					sendSeeMessageByUserId(
						player.user.id,
						'game_started',
						this.gameId
					);
			}
			this.status = GameStatus.RUNNING;

			this.fastify.log.info(
				`Game ${this.gameId} started with ${this.players.length} players.`
			);
		}
	}

	// this updates the lobby state for everyone
	async updateLobbyState() {
		if (this.status !== GameStatus.WAITING) return;
		
		this.lastLobbyUpdate = Date.now();

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
			localPlayerId:
				this.players.find(
					(p) =>
						p instanceof LocalPlayer && p.owner.user.id === this.admin.id
				)?.playerId || -1,
			t:
				(
					this.players.find(
						(p) => p instanceof UserPlayer && p.user.id === this.admin.id
					) as UserPlayer
				)?.lang || i18next.getFixedT('en'),
			tournamentTree: this.tournament
				? this.tournament.getBracketJSON()
				: null,
			availableMaps: this.availableMaps,
			alreadyStarted: this.alreadyStarted,
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
					t: player.lang,
					tournamentTree: this.tournament
						? this.tournament.getBracketJSON()
						: null,
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
	async endGame(
		end_message: string,
		winner: Player | null = null,
		save_game = true
	) {
		this.fastify.log.info(
			`Ending game ${this.gameId} with message: ${end_message}`
		);

		this.status = GameStatus.WAITING;

		if (
			this.config.gameType === GameType.TOURNAMENT &&
			this.tournament &&
			winner
		) {
			try {
				if (
					this.players.find(
						(p) => p instanceof UserPlayer && p.user.id === this.admin.id
					) === undefined
				)
					throw new Error(
						'Cannot advance tournament: Is not in the game anymore'
					);
				if (
					this.players.find((p) => p.playerId === winner.playerId) ===
					undefined
				)
					throw new Error(
						'Cannot advance tournament: Winner is not a in the game'
					);
				this.tournament.advance(winner);
			} catch (e) {
				this.fastify.log.error(`Error advancing tournament: ${e}`);
				for (const player of this.players) {
					if (!(player instanceof UserPlayer)) continue;
					player.disconnect("Error advancing tournament");
					sendSeeMessageByUserId(
						player.user.id,
						'game_closed',
						end_message
					);
				}
				removeGame(this.gameId);
				return;
			}

			if (save_game) {
				(async () => {
					try {
						await saveCompletedGame(this, this.fastify);
					} catch (_e) {
						// already logged inside saveCompletedGame
					}
				})();
			}

			let match = this.tournament.getCurrentMatch();

			while (
				this.config.autoAdvance &&
				!this.tournament.isFinished() &&
				match &&
				match.player1 instanceof AiPlayer &&
				match.player2 instanceof AiPlayer
			) {
				this.tournament.advance(
					match.player1.aiDifficulty > match.player2.aiDifficulty
						? match.player1
						: match.player2
				);
				match = this.tournament.getCurrentMatch();
			}
			if (this.tournament.isFinished()) {
				console.log('tournament finished');
				if (save_game) {
					(async () => {
						try {
							await saveCompletedGame(this, this.fastify);
						} catch (_e) {
							// already logged inside saveCompletedGame
						}
					})();
				}

				// this occurs when the game ends because its actually over because someone won or the admin left as of now
				for (const player of this.players) {
					if (!(player instanceof UserPlayer)) continue;
					player.disconnect("Tournament over");
					sendSeeMessageByUserId(
						player.user.id,
						'game_closed',
						`Tournament ended,<br>Winner: ${
							this.tournament.getWinner()?.displayName || 'Unknown'
						}`
					);
				}

				removeGame(this.gameId);
				return;
			}

			this.fastify.log.info('tournament advancing');
			match = this.tournament.getCurrentMatch();
			const p1 = this.players.find(
				(p) => p.playerId === match!.player1!.playerId
			);
			const p2 = this.players.find(
				(p) => p.playerId === match!.player2!.playerId
			);
			for (const player of this.players) {
				player.lives = this.config.playerLives;
				if (!(player instanceof UserPlayer)) continue;
				/*
				player.disconnect(this.admin.id === player.user.id
								? 'lobby_admin'
								: 'lobby', 4242);
				*/
				player.disconnect("", 4242);
				sendPopupToClient(
					this.fastify,
					player.user.id,
					'Tournament advancing',
					`Next match: ${p1?.displayName ?? 'Left Player'} vs ${
						p2?.displayName ?? 'Left Player'
					}`
				);

				sendSseRawByUserId(
					player.user.id,
					`data: ${JSON.stringify({
						type:
							this.admin.id === player.user.id
								? 'game_tournament_admin_lobby_warp'
								: 'game_tournament_lobby_warp',
						gameId: this.gameId,
					})}\n\n`
				);
			}
		} else {
			console.log('end game classic non tournament');
			if (save_game) {
				(async () => {
					try {
						await saveCompletedGame(this, this.fastify);
					} catch (_e) {
						// already logged inside saveCompletedGame
					}
				})();
			}

			// this occurs when the game ends because its actually over because someone won or the admin left as of now
			for (const player of this.players) {
				if (!(player instanceof UserPlayer)) continue;
				player.disconnect("Game over");
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
			players: this.players
				.filter((player) => !player.spectator)
				.map((player) => player.formatStateForClients()),
			activePowerups: this.activePowerups,
		};
	}
}
