import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
// import { WebSocket as WSWebSocket } from 'ws';
// import { startGame, runningGames } from '../../../services/pong/games/games';
import { checkAuth } from '../../../services/auth/auth';
import {
	defaultGameSettings,
	Game,
	GameStatus,
	GameType,
	// GameType,
} from '../../../services/pong/games/gameClass';
import { connectedClients, sendSseRawByUserId } from '../../../services/sse/handler';
import { runningGames } from '../../../services/pong/games/games';
import { getUserById } from '../../../services/database/users';
import { getFriends } from '../../../services/database/friends';
import {
	AiPlayer,
	LocalPlayer,
	UserPlayer,
} from '../../../services/pong/games/playerClass';
import { Tournament } from '../../../services/pong/games/tournamentClass';

const games: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post(
		'/create',
		{
			preValidation: [fastify.authenticate],
			schema: {},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}

			if (!connectedClients.get(user.id)) {
				fastify.log.warn(`User ${user.username} is not connected`);
				return reply.code(400).send({ error: 'User is not connected to SSE' });
			}

			fastify.log.info(`Creating a new game for user: ${user.username}`);
			try {
				let existingGame = runningGames.find((g) => g.admin.id === user.id); // find game where user is in either as admin
				if (existingGame && existingGame.status === GameStatus.WAITING) {
					return reply.code(200).send({
						message:
							'You already have a game in lobby phase.. putting you back in there!',
						gameId: existingGame.gameId,
					});
				} else if (
					existingGame &&
					existingGame.status === GameStatus.RUNNING
				) {
					return reply.code(401).send({
						error: 'Seems like you have a running game already.. wait for it to end before creating a new one (yes you shouldnt have ended up here!)',
					});
				}

				const id: number = runningGames.length + 1; // Temporary ID generation
				const game = new Game(id, user, fastify, defaultGameSettings);
				runningGames.push(game);
				game.players.splice(0, game.players.length);
				await game.addUserPlayer(user, false, request.t); // Adding the admin player

				fastify.log.info(`Game created with ID: ${id}`);

				return reply.code(200).send({
					message: 'Game created successfully',
					gameId: id,
				});
			} catch (err) {
				fastify.log.error(`Error creating game: ${err}`);
				return reply.code(500).send({ error: 'Failed to create game' });
			}
		}
	);

	const gameSettingsSchema = {
		type: 'object',
		properties: {
			powerupsEnabled: {
				type: 'boolean',
				errorMessage: {
					type: 'Powerups enabled setting must be true or false',
				},
			},
			playerLives: {
				type: 'number',
				minimum: 1,
				maximum: 10,
				errorMessage: {
					type: 'Player lives must be a number',
					minimum: 'Player lives must be at least 1',
					maximum: 'Player lives cannot exceed 10',
				},
			},
			gameDifficulty: {
				type: 'number',
				minimum: 1,
				maximum: 10,
				errorMessage: {
					type: 'Game difficulty must be a number',
					minimum: 'Game difficulty must be at least 1',
					maximum: 'Game difficulty cannot exceed 10',
				},
			},
			map: {
				type: 'string',
				minLength: 1,
				maxLength: 50,
				pattern: '^[a-zA-Z0-9_-]+$',
				errorMessage: {
					type: 'Map name must be a text value',
					minLength: 'Map name cannot be empty',
					maxLength: 'Map name cannot be longer than 50 characters',
					pattern:
						'Map name can only contain letters, numbers, underscores, and hyphens',
				},
			},
			autoAdvance: {
				type: 'boolean',
				errorMessage: {
					type: 'Auto advance must be a boolean value',
				},
			},
			gameType: {
				type: 'string',
				pattern: '^[a-zA-Z0-9_-]+$',
				errorMessage: {
					type: 'Map name must be a text value',
					pattern:
						'Map name can only contain letters, numbers, underscores, and hyphens',
				},
			},
			aiUpdate: {
				type: 'object',
				properties: {
					playerId: {
						type: 'number',
						minimum: 0,
						errorMessage: {
							type: 'AI Player ID must be a number',
							minimum: 'AI Player ID cannot be negative',
						},
					},
					name: {
						type: 'string',
						minLength: 1,
						maxLength: 32,
						errorMessage: {
							type: 'AI name must be a text value',
							minLength: 'AI name cannot be empty',
							maxLength: 'AI name cannot be longer than 32 characters',
						},
					},
					difficulty: {
						type: 'number',
						minimum: 1,
						maximum: 10,
						errorMessage: {
							type: 'AI difficulty must be a number',
							minimum: 'AI difficulty must be at least 1',
							maximum: 'AI difficulty cannot exceed 10',
						},
					},
				},
				required: ['playerId'],
				additionalProperties: false,
				errorMessage: {
					required: {
						playerId: 'Player ID is required for AI updates',
					},
					additionalProperties:
						'Unknown field in AI update. Only playerId, name, and difficulty are allowed',
				},
			},
			localPlayerUpdate: {
				type: 'object',
				properties: {
					playerId: {
						type: 'number',
						minimum: 0,
						errorMessage: {
							type: 'Local Player ID must be a number',
							minimum: 'Local Player ID cannot be negative',
						},
					},
					name: {
						type: 'string',
						minLength: 1,
						maxLength: 32,
						errorMessage: {
							type: 'Local player name must be a text value',
							minLength: 'Local player name cannot be empty',
							maxLength:
								'Local player name cannot be longer than 32 characters',
						},
					},
				},
				required: ['playerId', 'name'],
				additionalProperties: false,
				errorMessage: {
					required: {
						playerId: 'Player ID is required for local player updates',
						name: 'Name is required for local player updates',
					},
					additionalProperties:
						'Unknown field in local player update. Only playerId and name are allowed',
				},
			},
		},
		required: [],
		additionalProperties: false,
		minProperties: 1,
		errorMessage: {
			minProperties: 'At least one setting must be provided to update',
			additionalProperties:
				'Unknown field provided. Only powerupsEnabled, playerLives, gameDifficulty, map, aiUpdate, and localPlayerUpdate are allowed',
		},
	};

	fastify.post(
		'/settings/reset',
		async (request: FastifyRequest, reply: FastifyReply) => {
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}

			const game = runningGames.find(
				(g) =>
					g.status === GameStatus.WAITING &&
					g.players.find(
						(p) => p instanceof UserPlayer && g.admin.id === user.id
					)
			);
			if (!game) {
				return reply.code(404).send({
					error: 'No game found for the user in lobby phase to reset settings',
				});
			}

			const oldGameType = game.config.gameType;
			game.config = defaultGameSettings;
			game.config.gameType = oldGameType; // Preserve the game type
			await game.updateLobbyState(request.t);
			return reply
				.code(200)
				.send({ message: 'Game settings reset successfully!' });
		}
	);

	fastify.post(
		'/settings',
		{
			preValidation: [fastify.authenticate],
			schema: {
				body: gameSettingsSchema,
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const {
				gameType,
				powerupsEnabled,
				playerLives,
				gameDifficulty,
				map,
				aiUpdate,
				localPlayerUpdate,
				autoAdvance,
			} = request.body as {
				gameType?: GameType;
				powerupsEnabled?: boolean;
				playerLives?: number;
				gameDifficulty?: number;
				map?: string;
				aiUpdate?: {
					playerId?: number;
					name?: string;
					difficulty?: number;
				};
				localPlayerUpdate?: {
					playerId?: number;
					name?: string;
				};
				autoAdvance?: boolean;
			};

			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}

			const game = runningGames.find(
				(g) =>
					g.status === GameStatus.WAITING &&
					g.players.find(
						(p) => p instanceof UserPlayer && p.user.id === user.id
					)
			);
			if (!game) {
				return reply.code(404).send({
					error: 'No game found for the user in lobby phase to change settings',
				});
			}

			if (game.alreadyStarted)
				return reply.code(401).send({
					error: 'You cant change settings after the first tournament game has been played',
				});

			const isAdmin = game.admin.id === user.id;
			let changed = false;

			if (isAdmin && map !== undefined) {
				fastify.log.info(
					`Updating map for game ${game.gameId} by user ${user.username}`
				);
				game.config.map = map.toLocaleLowerCase();
				changed = true;
			}

			if (isAdmin && powerupsEnabled !== undefined) {
				fastify.log.info(
					`Updating game settings for game ${game.gameId} by user ${user.username}`
				);
				game.config.powerupsEnabled = powerupsEnabled;
				changed = true;
			}

			if (isAdmin && playerLives !== undefined) {
				fastify.log.info(
					`Updating player lives for game ${game.gameId} by user ${user.username}`
				);
				game.config.playerLives = playerLives;
				changed = true;
			}

			if (isAdmin && autoAdvance !== undefined) {
				fastify.log.info(
					`Updating auto advance for game ${game.gameId} by user ${user.username}`
				);
				game.config.autoAdvance = autoAdvance;
				changed = true;
			}

			if (isAdmin && gameDifficulty !== undefined) {
				if (gameDifficulty < 1 || gameDifficulty > 10) {
					return reply.code(400).send({
						error: 'Game difficulty must be between 1 and 10.',
					});
				}

				fastify.log.info(
					`Updating game difficulty for game ${game.gameId} by user ${user.username}`
				);
				game.config.gameDifficulty = gameDifficulty;
				changed = true;
			}

			if (gameType !== undefined) {
				game.config.gameType = gameType;
				if (gameType === GameType.TOURNAMENT) {
					game.config.maxPlayers = 8;
					for (
						let i = game.players.length;
						i < game.config.maxPlayers;
						i++
					) {
						await game.addAiPlayer(
							game.config.gameDifficulty,
							true,
							request.t
						);
					}
					game.tournament = new Tournament(game.players);
				} else if (gameType === GameType.CLASSIC) {
					game.config.maxPlayers = 4;
					for (
						let i = game.players.length;
						i > game.config.maxPlayers;
						i--
					) {
						await game.removePlayer(
							request.t,
							game.players[i - 1].playerId,
							true
						);
					}
					game.tournament = undefined;
					game.alreadyStarted = false;
					for (const player of game.players) {
						player.spectator = false;
						player.lives = game.config.playerLives;
					}
				}
				changed = true;
			}

			if (
				isAdmin &&
				aiUpdate !== undefined &&
				aiUpdate.playerId !== undefined
			) {
				const ai = game.players.find(
					(p) => p instanceof AiPlayer && p.playerId === aiUpdate.playerId
				);

				if (ai === undefined) {
					return reply.code(404).send({ error: 'AI player not found' });
				}

				if (aiUpdate.name !== undefined) {
					fastify.log.info(
						`Updating AI name for game ${game.gameId} by user ${user.username}`
					);
					(ai as AiPlayer).setName(aiUpdate.name);
					changed = true;
				}

				if (aiUpdate.difficulty !== undefined) {
					if (aiUpdate.difficulty < 1 || aiUpdate.difficulty > 10) {
						return reply.code(400).send({
							error: 'AI difficulty must be between 1 and 10.',
						});
					}
					fastify.log.info(
						`Updating AI difficulty for game ${game.gameId} by user ${user.username}`
					);
					(ai as AiPlayer).setDifficulty(aiUpdate.difficulty);
					changed = true;
				}
			}

			if (
				localPlayerUpdate !== undefined &&
				localPlayerUpdate.playerId !== undefined &&
				localPlayerUpdate.name !== undefined
			) {
				const localPlayer = game.players.find(
					(p) =>
						p instanceof LocalPlayer &&
						p.playerId === localPlayerUpdate.playerId
				);

				fastify.log.info(`local player update`);

				if (localPlayer === undefined) {
					return reply.code(404).send({ error: 'Local player not found' });
				}
				fastify.log.info(
					`Updating Local Player name for game ${game.gameId} by user ${user.username}`
				);
				(localPlayer as LocalPlayer).setName(localPlayerUpdate.name);
				changed = true;
			}

			if (changed || localPlayerUpdate !== undefined) {
				await game.updateLobbyState(request.t);
				fastify.log.info(
					`Game settings updated for game ${game.gameId} by user ${user.username}`
				);
				return reply
					.code(200)
					.send({ message: 'Game settings updated successfully!' });
			} else
				return reply
					.code(200)
					.send({ message: 'No game settings changed!' });
		}
	);

	// this invites another user
	fastify.post(
		'/invite/:userId',
		{
			preValidation: [fastify.authenticate],
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}
			const { userId } = request.params as { userId: string };
			const parsedUserId = Number.parseInt(userId, 10);

			const inviteUser = await getUserById(parsedUserId, fastify);
			if (!inviteUser)
				return reply.code(404).send({ error: `No such user found!` });

			const friends = await getFriends(user.id, fastify);
			if (friends) {
				const isFriend = friends.find((f) => f.id === inviteUser.id);
				if (!isFriend)
					return reply.code(401).send({
						error: 'Cant invite user because they are not friends with you!',
					});
			}

			const friendGame = runningGames.find((g) =>
				g.players.find(
					(p) => p instanceof UserPlayer && p.user.id === inviteUser.id
				)
			);
			if (friendGame)
				return reply.code(401).send({
					error: 'Cant invite a user which is already in a game',
				});

			const game = runningGames.find((g) => g.admin.id === user.id);
			fastify.log.info(
				`User ${user.username} is inviting user with ID ${parsedUserId} to their game.`
			);
			if (!game) {
				return reply.code(404).send({ error: 'No game found for the user' });
			}

			fastify.log.info(`Game found: ${game.gameId} for user ${user.username}`);
			if (
				game.players.find(
					(p) => p instanceof UserPlayer && p.user.id === parsedUserId
				)
			) {
				return reply
					.code(400)
					.send({ error: 'User is already invited to the game' });
			}

			fastify.log.info(
				`Sending game invite to user with ID ${parsedUserId} for game ${game.gameId}`
			);
			if (game.status !== GameStatus.WAITING) {
				return reply.code(400).send({
					error: 'Cannot invite players to a game that has already started',
				});
			}
			try {
				if (
					game.config.gameType === GameType.TOURNAMENT &&
					!game.alreadyStarted
				) {
					const ai = game.players.find((p) => p instanceof AiPlayer);
					if (ai) game.removePlayer(request.t, ai.playerId, true);
				}
				await game.addUserPlayer(inviteUser, false, request.t);
			} catch (err) {
				return reply.code(404).send({ error: err });
			}

			sendSseRawByUserId(
				inviteUser.id,
				`data: ${JSON.stringify({
					type: 'game_invite',
					gameId: game.gameId,
				})}\n\n`
			);

			return reply.code(200).send({
				message: `Game invite sent to ${inviteUser!.displayname}`,
			});
		}
	);

	// this is there to leave a game for a UserPlayer
	fastify.post(
		'/leave',
		{
			preValidation: [fastify.authenticate],
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}

			const game = runningGames.find(
				(g) =>
					g.admin.id === user.id ||
					g.players.find(
						(p) => p instanceof UserPlayer && p.user.id === user.id
					)
			);
			if (!game) {
				// TODO: get from the db if its a past game
				return reply.code(200).send({ message: 'No game found for the user or game is over' });
			}

			const player = game.players.find(
				(p) => p instanceof UserPlayer && p.user.id === user.id
			);

			try {
				if (!player) throw new Error('You are not a player in this game!');
				game.removePlayer(request.t, player.playerId);
			} catch (err) {
				if (err instanceof Error)
					return reply
						.code(500)
						.send({ error: `Failed to leave game: ${err.message}` });
				return reply
					.code(500)
					.send({ error: 'Failed to leave game: Unknown Error' });
			}
			return reply.code(200).send({ message: 'Left game successfully' });
		}
	);

	// this can simply remove any player
	fastify.post(
		'/players/kick/:playerId',
		{
			preValidation: [fastify.authenticate],
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}

			const { playerId } = request.params as { playerId: string };
			const parsedPlayerId = Number.parseInt(playerId, 10);

			const game = runningGames.find((g) => g.admin.id === user.id);
			if (!game) {
				return reply.code(404).send({ error: 'No game found for the user' });
			}

			if (game.status !== GameStatus.WAITING)
				return reply.code(401).send({
					error: 'You can only kick players while in the lobby not ingame!',
				});

			const playerToKick = game.players.find(
				(p) => p.playerId === parsedPlayerId
			);
			if (!playerToKick) {
				return reply
					.code(404)
					.send({ error: 'No such player found in the game to kick' });
			}
			const self = game.players.find(
				(p) => p instanceof UserPlayer && p.user.id === user.id
			);
			if (
				playerToKick.playerId &&
				self &&
				self.playerId === playerToKick.playerId
			)
				return reply.code(404).send({
					error: 'You cant kick yourself ( Just leave.. kicking yourself is not cool :c )',
				});
			try {
				await game.removePlayer(request.t, parsedPlayerId, true);
				return reply.code(200).send({
					message: `Player ${playerToKick.displayName} kicked from the game`,
				});
			} catch (err) {
				if (err instanceof Error)
					return reply.code(404).send({ error: err.message });
				return reply.code(404).send({ error: 'Unknown error' });
			}
		}
	);

	// this is for the UserPlayers to add LocalPlayers and for the Admin to add AIPlayer
	fastify.post(
		'/players/add/:type',
		{
			preValidation: [fastify.authenticate],
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}

			const { type } = request.params as { type: string };
			if (!type) return reply.code(401).send({ error: 'Missing player type' });

			const game = runningGames.find((g) =>
				g.players.some(
					(p) =>
						p instanceof UserPlayer &&
						p.user.id === user.id &&
						p.joined === true
				)
			);
			if (!game) {
				return reply.code(404).send({
					error: 'No game found to add Player where User is joined',
				});
			}

			try {
				if (type === 'ai') {
					if (user.id === game.admin.id) {
						await game.addAiPlayer(4, false, request.t);
						return reply
							.code(200)
							.send({ message: 'AI Player added successfully!' });
					} else
						return reply.code(401).send({
							error: 'Only the admin is allowed to add an AI Player!',
						});
				} else if (type === 'local') {
					const owner = game.players.find(
						(p) => p instanceof UserPlayer && p.user.id === user.id
					);
					if (owner) {
						const userLocalPlayerAmount = game.players.filter(
							(p) =>
								p instanceof LocalPlayer &&
								p.owner.user.id === user.id
						).length;

						if (userLocalPlayerAmount >= 1) {
							return reply.code(401).send({
								error: 'You can only add one Local Player per User!',
							});
						}
						if (game.config.gameType === GameType.TOURNAMENT) {
							const ai = game.players.find(
								(p) => p instanceof AiPlayer
							);
							if (ai) game.removePlayer(request.t, ai.playerId, false);
						}
						await game.addLocalPlayer(
							owner as UserPlayer,
							false,
							request.t
						);
						return reply.code(200).send({
							message: 'Local Player added successfully!',
						});
					} else
						return reply.code(404).send({
							error: 'No owner found for local Player!',
						});
				} else
					return reply.code(404).send({
						error: 'Invalid Player type... only "ai" or "local" allowed!',
					});
			} catch (err) {
				if (err instanceof Error)
					return reply

						.code(404)

						.send({ error: 'Failed to add player: ' + err.message });
				return reply.code(404).send({ error: 'Unknown error' });
			}
		}
	);

	fastify.post(
		'/start',
		{
			preValidation: [fastify.authenticate],
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}

			const game = runningGames.find(
				(g) => g.admin.id === user.id && g.status === GameStatus.WAITING
			);
			if (!game) {
				return reply
					.code(404)
					.send({ error: 'No game found for the user to start' });
			}

			if (game.status !== GameStatus.WAITING)
				return reply.code(401).send({
					error: 'You cant start the game while it is already running!',
				});

			try {
				await game.startGame();
				return reply.code(200).send({
					message: 'Game started successfully',
				});
			} catch (err) {
				if (err instanceof Error)
					return reply.code(500).send({ error: err.message });
				return reply.code(500).send({ error: 'Unknown error' });
			}
		}
	);

	fastify.get(
		'/run',
		{
			preValidation: [fastify.authenticate],
			schema: {
				querystring: {
					type: 'object',
					properties: {
						gameId: { type: 'string' },
					},
					required: ['gameId'],
				},
			},
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}
			const { gameId } = request.query as { gameId: string };
			const parsedGameId = Number.parseInt(gameId, 10);

			const game = runningGames.find((g) => g.gameId === parsedGameId);
			if (!game) {
				const isApiRequest =
					request.headers['content-type']?.includes('application/json') ||
					request.headers['accept']?.includes('application/json') ||
					request.headers['x-requested-with'] === 'XMLHttpRequest';

				if (isApiRequest) {
					// Send JSON error for API requests
					return reply.code(404).send({ error: 'Game not found' });
				} else {
					// Redirect for direct URL access
					return reply.redirect('/partial/pages/index');
				}
			}

			if (game.status !== GameStatus.RUNNING)
				return reply.code(404).send({
					error: 'The game you are trying to join is not currently running!',
				});

			const player = game.players.find(
				(p) => p instanceof UserPlayer && p.user.id === user.id
			);

			if (player) {
				return reply.code(200).view('game', {
					ownerName: game.admin.displayname,
					gameSettings: game.config,
					players: game.players,
				});
			} else
				return reply
					.code(404)
					.send({ error: 'You are not a player in this game!' });
		}
	);

	// TODO: make it redirect and load the full page when nothing to join exists
	fastify.get(
		'/join/:gameId/:accepted',
		{ preValidation: [fastify.authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}
			const { gameId, accepted } = request.params as {
				gameId: string;
				accepted: string;
			};
			const parsedGameId = Number.parseInt(gameId, 10);

			const game = runningGames.find(
				(g) => g.gameId === parsedGameId && g.status === GameStatus.WAITING
			);
			if (!game) {
				return reply
					.code(404)
					.send({ error: 'Game not found or already running' });
			}

			const player = game.players.find(
				(p) => p instanceof UserPlayer && p.user.id === user.id
			);

			if (player) {
				if (accepted === 'false') {
					try {
						await game.removePlayer(request.t, player.playerId);
						return reply.code(200).send({
							message: 'You have declined the game invitation.',
						});
					} catch (err) {
						if (err instanceof Error)
							return reply.code(400).send({
								error: `Failed to decline invite: ${err.message}`,
							});
						return reply.code(400).send({
							error: 'Failed to decline invite: Unknown error',
						});
					}
				} else if (accepted === 'true') player.joined = true;
				else
					return reply
						.code(404)
						.send({ error: 'Invalid accepted parameter' });
			} else
				return reply
					.code(404)
					.send({ error: 'You are not invited to this game!' });
			game.updateLobbyState(request.t);
			return reply.code(200).view('lobby', {
				ownerName: game.admin.displayname,
				gameSettings: game.config,
				players: game.players,
				initial: true, // to load the lobby script
				localPlayerId: -1,
				selfId: player?.playerId || -1,
				tournamentTree: game.tournament
					? game.tournament.getBracketJSON()
					: null,
			});
		}
	);

	fastify.get(
		'/connect',
		{
			websocket: true,
			preValidation: [fastify.authenticate],
			schema: {
				querystring: {
					type: 'object',
					properties: {
						gameId: { type: 'string' },
					},
					required: ['gameId'],
				},
			},
		},
		async (socket, request: FastifyRequest) => {
			const { gameId } = request.query as { gameId: string };
			const parsedGameId = Number.parseInt(gameId, 10);

			if (gameId === undefined || gameId === null) {
				socket.close(1008, 'Game ID is required');
				return;
			}

			const user = await checkAuth(request, false, fastify);
			if (!user) {
				socket.close(1008, 'Unauthorized');
				return;
			}

			const game = runningGames.find((g) => g.gameId === parsedGameId);
			if (!game) {
				socket.close(1008, 'Game not found!');
				return;
			}

			const player = game.players.find(
				(p) => p instanceof UserPlayer && p.user.id === user.id
			);
			if (!player) {
				socket.close(1008, 'Player not found');
				return;
			}

			if (!(player instanceof UserPlayer)) {
				socket.close(1008, 'Player not a UserPlayer');
				return;
			}

			player.wsocket = socket;

			fastify.log.info(
				`Player ${player.playerId} connected to game ${parsedGameId}.`
			);

			const localPlayer = game.players.find(
				(l) => l instanceof LocalPlayer && l.owner === player
			) as LocalPlayer | undefined;

			socket.send(
				JSON.stringify({
					type: 'state',
					state: game.formatStateForClients(),
				})
			);

			socket.on('error', (error) => {
				fastify.log.error(
					`WebSocket error for player ${player.playerId} in game ${parsedGameId}:`,
					error
				);

				// TODO: add some client socket error management here like ragequit and so on

				player.disconnect();
			});

			socket.on('message', (message: Buffer) => {
				const msgStr = message.toString();
				// fastify.log.info(
				// 	`Received message from player ${player.playerId}: ${msgStr}`
				// );

				try {
					const data = JSON.parse(msgStr);
					if (data.type === 'move') {
						if (data.user === 'user')
							player.movementDirection = data.dir;
						else if (data.user === 'local' && localPlayer)
							localPlayer.movementDirection = data.dir;
						// fastify.log.info('Server received movement data:', data);
					}
				} catch (err) {
					fastify.log.error(
						`Invalid message format from player ${player.playerId}:`,
						err
					);
				}
			});

			socket.on('close', () => {
				fastify.log.info(
					`Player ${player.playerId} disconnected from game ${parsedGameId}.`
				);
				player.disconnect();

				// TODO: do some leave action (depends on the game.. what do we want to do?)
			});
		}
	);
};

export default games;
