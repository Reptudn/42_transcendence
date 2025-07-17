import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
// import { WebSocket as WSWebSocket } from 'ws';
// import { startGame, runningGames } from '../../../services/pong/games/games';
import { checkAuth } from '../../../services/auth/auth';
import {
	Game,
	GameStatus,
	UserPlayer,
} from '../../../services/pong/games/gameFormats';
import { sendSseRawByUserId } from '../../../services/sse/handler';
import { runningGames } from '../../../services/pong/games/games';
import { getUserById } from '../../../services/database/users';
import { getFriends } from '../../../services/database/friends';
// import { createGameInDB } from '../../../services/database/games';

// const startGameSchema = {
// 	body: {
// 		type: 'object',
// 		required: [
// 			'map',
// 			'playerLives',
// 			'gameDifficulty',
// 			'powerups',
// 			'players',
// 		],
// 		properties: {
// 			map: {
// 				type: 'string',
// 				errorMessage: {
// 					type: 'Map must be a string.',
// 				},
// 			},
// 			playerLives: {
// 				type: 'integer',
// 				minimum: 0,
// 				errorMessage: {
// 					type: 'Player lives must be an integer.',
// 					minimum: 'Player lives cannot be negative.',
// 				},
// 			},
// 			gameDifficulty: {
// 				type: 'integer',
// 				minimum: 0,
// 				errorMessage: {
// 					type: 'Game difficulty must be an integer.',
// 					minimum: 'Game difficulty must be at least 0.',
// 				},
// 			},
// 			powerups: {
// 				type: 'boolean',
// 				errorMessage: {
// 					type: 'Powerups must be a boolean value.',
// 				},
// 			},
// 			players: {
// 				type: 'array',
// 				errorMessage: {
// 					type: 'Players must be an array.',
// 				},
// 				items: {
// 					type: 'object',
// 					required: ['type'],
// 					properties: {
// 						type: {
// 							type: 'string',
// 							enum: ['user', 'local', 'ai'],
// 							errorMessage: {
// 								type: 'Player type must be a string.',
// 								enum: 'Player type must be one of: user, local, ai.',
// 							},
// 						},
// 						id: {
// 							type: 'integer',
// 							errorMessage: {
// 								type: 'For a user, id must be an integer.',
// 							},
// 						},
// 						controlScheme: {
// 							type: 'string',
// 							errorMessage: {
// 								type: 'For a local player, controlScheme must be a string.',
// 							},
// 						},
// 						aiLevel: {
// 							type: 'integer',
// 							minimum: 0,
// 							maximum: 9,
// 							errorMessage: {
// 								type: 'For an AI player, aiLevel must be an integer.',
// 								minimum: 'AI level cannot be less than 0.',
// 								maximum: 'AI level cannot exceed 9.',
// 							},
// 						},
// 						aiOrLocalPlayerName: {
// 							type: 'string',
// 							errorMessage: {
// 								type: 'For a local or AI player, aiOrLocalPlayerName must be a string.',
// 							},
// 						},
// 					},
// 					additionalProperties: false,
// 					errorMessage: {
// 						additionalProperties:
// 							'Player object contains disallowed properties.',
// 					},
// 				},
// 			},
// 		},
// 		additionalProperties: false,
// 		errorMessage: {
// 			required: {
// 				map: 'Map is required.',
// 				playerLives: 'Player lives are required.',
// 				gameDifficulty: 'Game difficulty is required.',
// 				powerups: 'Powerups flag is required.',
// 				players: 'Players array is required.',
// 			},
// 			additionalProperties:
// 				'No additional properties are allowed in game settings.',
// 		},
// 	},
// };

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

			fastify.log.info(`Creating a new game for user: ${user.username}`);
			try {
				let existingGame = runningGames.find(
					(g) => g.admin.id === user.id
				); // find game where user is in either as admin
				if (existingGame && existingGame.status === GameStatus.WAITING) {
					return reply
						.code(200).send({ message: 'You already have a game in lobby phase.. putting you back in there!', gameId: existingGame.gameId });
				}

				const id: number = runningGames.length + 1; // Temporary ID generation
				const game = new Game(id, user, fastify);
				runningGames.push(game);
				game.players.splice(0, game.players.length);
				await game.addUserPlayer(user); // Adding the admin player

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

	fastify.post(
		'/settings',
		{
			preValidation: [fastify.authenticate],
			schema: {} // TODO: add schema for parameter validation
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const { powerupsEnabled, powerups, playerLives, gameDifficulty } = request.body as {
				powerupsEnabled?: boolean;
				powerups?: Powerups[];
				playerLives?: number;
				gameDifficulty?: number;
			};
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}

			const game = runningGames.find((g) => g.admin.id === user.id);
			if (!game) {
				return reply
					.code(404)
					.send({ error: 'No game found for the user' });
			}

			if (game.status !== GameStatus.WAITING)
				return reply.code(401).send({ error: 'You cant update the settings while this game is already running!' });

			if (powerupsEnabled) {
				fastify.log.info(`Updating game settings for game ${game.gameId} by user ${user.username}`);
				game.config.powerupsEnabled = powerupsEnabled;
			}
			if (powerups) {
				if (!game.config.powerupsEnabled) {
					return reply.code(400).send({
						error: 'Powerups are not enabled for this game. Turn on powerups first.',
					});
				}
				fastify.log.info(`Updating powerups for game ${game.gameId} by user ${user.username}`);
				game.config.powerups = powerups;
			}
			if (playerLives) {
				fastify.log.info(`Updating player lives for game ${game.gameId} by user ${user.username}`);
				game.config.playerLives = playerLives;
			}

			if (gameDifficulty) {

				if (gameDifficulty < 1 || gameDifficulty > 10) {
					return reply.code(400).send({
						error: 'Game difficulty must be between 1 and 10.',
					});
				}

				fastify.log.info(`Updating game difficulty for game ${game.gameId} by user ${user.username}`);
				game.config.gameDifficulty = gameDifficulty;
			}

			game.updateLobbyState();
			fastify.log.info(
				`Game settings updated for game ${game.gameId} by user ${user.username}`
			);
			return reply
				.code(200)
				.send({ message: 'Game settings updated successfully' });
		}
	);

	// TODO: add invite cancel
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

			const game = runningGames.find((g) => g.admin.id === user.id);
			fastify.log.info(
				`User ${user.username} is inviting user with ID ${parsedUserId} to their game.`
			);
			if (!game) {
				return reply
					.code(404)
					.send({ error: 'No game found for the user' });
			}

			fastify.log.info(
				`Game found: ${game.gameId} for user ${user.username}`
			);
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
				game.addUserPlayer(inviteUser);
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

			const game = runningGames.find((g) => g.admin.id === user.id);
			if (!game) {
				return reply
					.code(404)
					.send({ error: 'No game found for the user' });
			}

			try {
				game.removePlayer(user.id);
			} catch (err) {
				return reply.code(500).send({ error: err });
			}
			return reply.code(200).send({ message: 'Left game successfully' });
		}
	);

	// this can simply remove any player
	fastify.post(
		'/kick/:playerId',
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

			const game = runningGames.find((g) => g.admin.id === user.id);
			if (!game) {
				return reply
					.code(404)
					.send({ error: 'No game found for the user' });
			}

			const playerToKick = game.players.find(
				(p) => p.playerId === parsedUserId
			);
			if (!playerToKick) {
				return reply
					.code(404)
					.send({ error: 'No such player found in the game' });
			}

			await game.removePlayer(parsedUserId);
			return reply.code(200).send({
				message: `Player ${playerToKick.displayName} kicked from the game`,
			});
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
			if (!type)
				return reply.code(401).send({ error: 'Missing player type' });

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
						await game.addAiPlayer('Sample AI Bot', 3);
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
						await game.addLocalPlayer(owner as UserPlayer);
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
				return reply.code(404).send({ error: err });
			}
		}
	);

	// fastify.post(
	// 	'/start',
	// 	{
	// 		preValidation: [fastify.authenticate],
	// 		schema: startGameSchema,
	// 	},
	// 	async (request, reply) => {
	// 		const user = await checkAuth(request, false, fastify);
	// 		if (!user) {
	// 			return reply.code(401).send({ error: 'Unauthorized' });
	// 		}

	// 		const gameSettings: GameSettings = request.body as GameSettings;
	// 		fastify.log.info(
	// 			'Game settings: ' +
	// 				JSON.stringify(gameSettings) +
	// 				' parsed from raw data ' +
	// 				JSON.stringify(request.body)
	// 		);

	// 		if (!gameSettings) {
	// 			return reply.code(400).send({ error: 'Missing game settings' });
	// 		}

	// 		fastify.log.info(
	// 			'Starting game with settings:',
	// 			JSON.stringify(gameSettings)
	// 		);

	// 		try {
	// 			await startGame(user, gameSettings as GameSettings, fastify);
	// 			return reply
	// 				.code(200)
	// 				.send({ message: 'Game started successfully' });
	// 		} catch (error) {
	// 			if (error instanceof Error) {
	// 				return reply.code(400).send({ error: error.message });
	// 			}
	// 			return reply.code(400).send({ error: 'Unknown error' });
	// 		}
	// 	}
	// );

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

			const game = runningGames.find((g) => g.gameId === parsedGameId);
			if (!game) {
				return reply.code(404).send({ error: 'Game not found' });
			}

			if (game.status !== GameStatus.WAITING)
				return reply.code(404).send({
					error: 'The game you are trying to join has already started!',
				});

			const player = game.players.find(
				(p) => p instanceof UserPlayer && p.user.id === user.id
			);

			if (player) {
				if (accepted === 'false') {
					await game.removePlayer(user.id);
					return reply.code(200).send({
						message: 'You have declined the game invitation.',
					});
				}

				if (!player.joined) {
					game.players.find(
						(p) => p instanceof UserPlayer && p.user.id === user.id
					)!.joined = true;
				}
			} else
				return reply
					.code(404)
					.send({ error: 'You are not invited to this game!' });
			game.updateLobbyState();
			return reply.code(200).view('lobby', {
				ownerName: game.admin.displayname,
				gameSettings: game.config,
				players: game.players,
				initial: true, // to load the lobby script
			});
		}
	);

	// fastify.get(
	// 	'/join/:gameId/:playerId',
	// 	{ websocket: true },
	// 	(socket, req) => {
	// 		const { gameId, playerId } = req.params as {
	// 			gameId: string;
	// 			playerId: string;
	// 		};
	// 		const parsedGameId = Number.parseInt(gameId, 10);
	// 		const parsedPlayerId = Number.parseInt(playerId, 10);

	// 		const game = runningGames.find((g) => g.gameId === parsedGameId);
	// 		if (!game) {
	// 			socket.close(1008, 'Game not found');
	// 			return;
	// 		}

	// 		const player = game.players.find(
	// 			(p) => p.playerId === parsedPlayerId
	// 		);
	// 		if (!player) {
	// 			socket.close(1008, 'Player not found');
	// 			return;
	// 		}

	// 		player.wsocket = socket as WSWebSocket;
	// 		fastify.log.info(
	// 			`Player ${parsedPlayerId} connected to game ${parsedGameId}.`
	// 		);

	// 		socket.on('message', (message: Buffer) => {
	// 			const msgStr = message.toString();
	// 			fastify.log.info(
	// 				`Received message from player ${parsedPlayerId}: ${msgStr}`
	// 			);

	// 			try {
	// 				const data = JSON.parse(msgStr);
	// 				if (data.type === 'chat') {
	// 					const text = data.text;
	// 					for (const p of game.players) {
	// 						if (p.wsocket && p.playerId !== parsedPlayerId) {
	// 							p.wsocket.send(
	// 								JSON.stringify({
	// 									type: 'chat',
	// 									playerId: parsedPlayerId,
	// 									text,
	// 								})
	// 							);
	// 						}
	// 					}
	// 				} else if (data.type === 'move') {
	// 					player.movementDirection = data.dir;
	// 					fastify.log.info(
	// 						'Server received movement data:',
	// 						data
	// 					);
	// 				}
	// 			} catch (err) {
	// 				fastify.log.error(
	// 					`Invalid message format from player ${parsedPlayerId}:`,
	// 					err
	// 				);
	// 			}
	// 		});

	// 		socket.on('close', () => {
	// 			fastify.log.info(
	// 				`Player ${parsedPlayerId} disconnected from game ${parsedGameId}.`
	// 			);
	// 			player.wsocket = null;
	// 		});
	// 	}
	// );

	// fastify.post('/kick/:userId', {
	// 	preValidation: [fastify.authenticate],
	// }, async (
	// 	request: FastifyRequest,
	// 	reply: FastifyReply
	// ) => {
	// 	const userToKick: User | null = await getUserById(request.params.userId, fastify);
	// 	if (!userToKick)
	// 		return reply.send({ message: `No such player with id ${request.params.userId} found` });
	// 	const user = await checkAuth(request, false, fastify);
	// 	if (!user)
	// 		return reply.send({ message: 'Unauthorized' });

	// 	let userGame: Game | null = null;
	// 	runningGames.forEach(game => {
	// 		if (game.adminId === user.id) {
	// 			userGame = game;
	// 			return;
	// 		}
	// 	});

	// 	if (!userGame)
	// 		return reply.send({ message: `User ${user.id} is not an admin of any game` });

	// 	userGame.players = userGame.players.filter(p => p.id !== userToKick.id);
	// 	fastify.log.info(`Player ${userToKick.username} has been kicked from game ${userGame.id}`);
	// 	return reply.send({ message: `Player ${userToKick.username} has been kicked from the game` });
	// });

	// fastify.get(
	// 	'/all',
	// 	{
	// 		preValidation: [fastify.authenticate],
	// 	},
	// 	async (request, reply) => {
	// 		// get all games from the database
	// 	}
	// );

	// fastify.get(
	// 	'/game/:id',
	// 	{
	// 		preValidation: [fastify.authenticate],
	// 	},
	// 	async (request, reply) => {
	// 		// get all games from the database
	// 	}
	// );
};

export default games;
