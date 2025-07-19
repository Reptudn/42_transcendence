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
			const { powerupsEnabled, powerups, playerLives, gameDifficulty, map } = request.body as {
				powerupsEnabled?: boolean;
				powerups?: Powerups[];
				playerLives?: number;
				gameDifficulty?: number;
				map?: string;
			};
			const user = await checkAuth(request, false, fastify);
			if (!user) {
				return reply.code(401).send({ error: 'Unauthorized' });
			}

			const game = runningGames.find((g) => (g.admin.id === user.id && g.status === GameStatus.WAITING));
			if (!game) {
				return reply
					.code(404)
					.send({ error: 'No game found for the user in lobby phase to change settings' });
			}

			let changed = false;

			if (map !== undefined) {
				fastify.log.info(`Updating map for game ${game.gameId} by user ${user.username}`);
				game.config.map = map.toLocaleLowerCase();
				changed = true;
			}

			if (powerupsEnabled !== undefined) {
				fastify.log.info(`Updating game settings for game ${game.gameId} by user ${user.username}`);
				game.config.powerupsEnabled = powerupsEnabled;
				changed = true;
			}
			if (powerups !== undefined) {
				if (!game.config.powerupsEnabled) {
					return reply.code(400).send({
						error: 'Powerups are not enabled for this game. Turn on powerups first.',
					});
				}
				else
				{
					fastify.log.info(`Updating powerups for game ${game.gameId} by user ${user.username}`);
					game.config.powerups = powerups;
					changed = true;
				}
			}
			if (playerLives !== undefined) {
				fastify.log.info(`Updating player lives for game ${game.gameId} by user ${user.username}`);
				game.config.playerLives = playerLives;
				changed = true;
			}

			if (gameDifficulty !== undefined) {

				if (gameDifficulty < 1 || gameDifficulty > 10) {
					return reply.code(400).send({
						error: 'Game difficulty must be between 1 and 10.',
					});
				}

				fastify.log.info(`Updating game difficulty for game ${game.gameId} by user ${user.username}`);
				game.config.gameDifficulty = gameDifficulty;
				changed = true;
			}

			if (changed)
			{
				await game.updateLobbyState();
				fastify.log.info(
					`Game settings updated for game ${game.gameId} by user ${user.username}`
				);
				return reply
					.code(200)
					.send({ message: 'Game settings updated successfully!' });
			}
			else
				return reply.code(200).send({ message: 'No game settings changed!' });
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

			const game = runningGames.find((g) => (g.admin.id === user.id
				|| g.players.find(p => p instanceof UserPlayer && p.user.id === user.id)
			));
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
				return reply
					.code(404)
					.send({ error: 'No game found for the user' });
			}

			const playerToKick = game.players.find(
				(p) => p.playerId === parsedPlayerId
			);
			if (!playerToKick) {
				return reply
					.code(404)
					.send({ error: 'No such player found in the game' });
			}
			const self = game.players.find(p => p instanceof UserPlayer && p.user.id === user.id);
			if (playerToKick.playerId && self && self instanceof UserPlayer && self.user.id === user.id)
				return reply.code(404).send({ error: 'You cant kick yourself ( Just leave.. kicking yourself is not cool :c )' });
			try {
				await game.removePlayer(parsedPlayerId);
				return reply.code(200).send({
					message: `Player ${playerToKick.displayName} kicked from the game`,
				});
			}
			catch (err) {
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
				if (err instanceof Error)
					return reply.code(404).send({ error: err.message });
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

			const game = runningGames.find((g) => g.admin.id === user.id && g.status === GameStatus.WAITING);
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

	fastify.get('/run', {
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
	}, async (request: FastifyRequest, reply: FastifyReply) => {
		const user = await checkAuth(request, false, fastify);
		if (!user) {
			return reply.code(401).send({ error: 'Unauthorized' });
		}
		const { gameId } = request.query as { gameId: string };
		const parsedGameId = Number.parseInt(gameId, 10);

		const game = runningGames.find((g) => g.gameId === parsedGameId);
		if (!game) {
			return reply.code(404).send({ error: 'Game not found' });
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
	});

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

			const game = runningGames.find((g) => (g.gameId === parsedGameId && g.status === GameStatus.WAITING));
			if (!game) {
				return reply.code(404).send({ error: 'Game not found or already running' });
			}

			const player = game.players.find(
				(p) => p instanceof UserPlayer && p.user.id === user.id
			);

			if (player) {
				if (accepted === 'false') {
					await game.removePlayer(user.id);
					return reply.code(200).send({
						message: 'You have declined the game invitation.',
					});
				} else if (accepted === 'true')
					player.joined = true;
				else
					return reply.code(404).send({ error: 'Invalid accepted parameter' });
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
			}
		},
		async (socket, request: FastifyRequest) => {
			const { gameId } = request.query as { gameId: string };
			const parsedGameId = Number.parseInt(gameId, 10);

			if (gameId === undefined || gameId === null)
			{
				socket.close(1008, 'Game ID is required');
				return;
			}

			const user = await checkAuth(request, false, fastify);
			if (!user) {
				socket.close(1008, 'Unauthorized');
				return;
			}

			const game = runningGames.find((g) => (g.gameId === parsedGameId));
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

			if (!(player instanceof UserPlayer))
			{
				socket.close(1008, 'Player not a UserPlayer');
				return;
			}

			player.wsocket = socket;

			fastify.log.info(
				`Player ${player.playerId} connected to game ${parsedGameId}.`
			);

			socket.send(
				JSON.stringify({ type: 'state', state: game.gameState })
			);

			socket.on('message', (message: Buffer) => {
				const msgStr = message.toString();
				fastify.log.info(
					`Received message from player ${player.playerId}: ${msgStr}`
				);

				try {
					const data = JSON.parse(msgStr);
					if (data.type === 'move') {
						player.movementDirection = data.dir;
						fastify.log.info(
							'Server received movement data:',
							data
						);
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

				// TODO: do some leave action
			});
		}
	);
};

export default games;
