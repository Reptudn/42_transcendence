import { FastifyPluginAsync } from 'fastify';
import {
	getUserAchievements,
	getAllAchievements,
} from '../../../services/database/achievements';
import { getFriends } from '../../../services/database/friends';
import {
	getUserTitleString,
	getUserTitle,
	getUserTitlesForTitle,
	getUserByUsername,
} from '../../../services/database/users';
import { checkAuth } from '../../../services/auth/auth';
import { runningGames } from '../../../services/pong/games/games';
import { getAvailableMaps } from '../../../services/pong/games/rawMapHandler';
import { UserPlayer } from '../../../services/pong/games/playerClass';
import { getUserRecentGames } from '../../../services/database/games';
import { getUser2faSecret } from '../../../services/database/totp';
import * as fs from 'fs';
import * as path from 'path';
import { connectedClients } from '../../../services/sse/handler';

const pages: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/2fa_code', async (request, reply) => {
		const query = request.query as { google?: string; userid?: string };
		const isGoogleLogin = query.google === '1';
		const userid = query.userid;
		return reply.view(
			'2fa_code.ejs',
			{
				isGoogleLogin,
				userid,
				t: request.t,
				isAuthenticated: false,
			},
			isGoogleLogin ? { layout: 'layouts/basic.ejs' } : {}
		);
	});

	const pageExists = (pageName: string): boolean => {
		const viewsPath = path.join(__dirname, '../../../../pages');
		const pagePath = path.join(viewsPath, `${pageName}.ejs`);
		// return true;
		return fs.existsSync(pagePath);
	};

	fastify.get(
		'/:page/:username?',
		{
			schema: {
				params: {
					type: 'object',
					properties: {
						username: {
							type: 'string',
							minLength: 1,
							maxLength: 100,
						},
						page: {
							type: 'string',
							minLength: 1,
							maxLength: 100,
							errorMessage: {
								type: 'Page must be a string.',
								minLength: 'Page must not be empty.',
								maxLength: 'Page must not exceed 100 characters.',
							},
						},
					},
					required: ['page'],
					errorMessage: {
						required: {
							page: 'Page parameter is required.',
						},
						additionalProperties:
							'No additional properties are allowed in parameters.',
					},
				},
			},
		},
		async (req: any, reply: any) => {
			let { page, username } = req.params;
			const loadpartial = req.headers['loadpartial'] === 'true';
			let layoutOption = loadpartial ? false : 'layouts/basic.ejs';
			const user = await checkAuth(req, false, fastify);

			let variables: { [key: string]: any } = {};
			variables['isAuthenticated'] = user != null;
			if (user != null) variables['name'] = user.displayname || user.username;
			else variables['name'] = 'Guest';

			let errorCode: number = 418;
			let defaultError: string =
				'Woopsie.. seems like you teleported to the wrong location!';

			fastify.log.info(`page is ${page}`);

			if (!pageExists(page)) {
				return reply.code(404).view(
					'error.ejs',
					{
						err_code: 404,
						err_message: `Page '${page}' not found`,
						isAuthenticated: user !== null,
						name: user && user.displayname,
						t: req.t,
					},
					{ layout: layoutOption }
				);
			}

			try {
				if (page === 'profile') {
					const profile = username
						? await getUserByUsername(username, fastify)
						: await checkAuth(req, true, fastify);
					if (!profile) {
						errorCode = 404;
						throw new Error('User not found');
					}
					let self_id: number | null = user ? user.id : null;
					let friend_id: number | null = req.params.profile_id
						? parseInt(req.params.profile_id)
						: null;
					if (friend_id == null && self_id == null) {
						errorCode = 400;
						throw new Error('No user id provided & not logged in');
					}
					let profileId: number = friend_id ?? self_id!;
					let isSelf = profileId === profile.id;

					profile.profile_picture = '/profile/' + profileId + '/picture';
					variables['user'] = profile;
					variables['isSelf'] = isSelf;
					if (user && user.id !== profile.id) {
						const currentUserFriends = await getFriends(
							user.id,
							fastify
						);
						variables['isFriended'] =
							currentUserFriends.find((f) => f.id === user.id) !==
							undefined;
					} else variables['isFriended'] = false;

					variables['online'] =
						isSelf ||
						(connectedClients.has(profile.id) &&
							connectedClients.get(profile.id) !== null);
					variables['ingame'] =
						runningGames.find((g) =>
							g.players.find(
								(p) =>
									p instanceof UserPlayer &&
									p.joined &&
									p.user.id === profile.id
							)
						) !== undefined;
					variables['title'] = await getUserTitleString(
						profile.id,
						fastify
					);

					const unlockedAchievements = await getUserAchievements(
						profile.id,
						fastify
					);
					const allAchievements = await getAllAchievements(fastify);
					const achievements = allAchievements.map((ach) => ({
						...ach,
						unlocked: unlockedAchievements.some(
							(ua) => ua.id === ach.id
						),
					}));
					variables['achievements'] = achievements;
					variables['unlockedCount'] = unlockedAchievements.length;
					variables['totalCount'] = allAchievements.length;
					variables['friends'] = await getFriends(profile.id, fastify);
					variables['games'] = await getUserRecentGames(
						profileId,
						5,
						fastify
					);
				} else if (page === 'edit_profile') {
					let profile = await checkAuth(req, true, fastify);
					if (!profile) {
						errorCode = 404;
						throw new Error('User not found');
					}
					variables['user'] = profile;

					variables['firstTitle'] = await getUserTitle(
						profile.id,
						1,
						fastify
					);
					variables['secondTitle'] = await getUserTitle(
						profile.id,
						2,
						fastify
					);
					variables['thirdTitle'] = await getUserTitle(
						profile.id,
						3,
						fastify
					);

					variables['firstTitles'] = await getUserTitlesForTitle(
						1,
						profile.id,
						fastify
					);
					variables['secondTitles'] = await getUserTitlesForTitle(
						2,
						profile.id,
						fastify
					);
					variables['thirdTitles'] = await getUserTitlesForTitle(
						3,
						profile.id,
						fastify
					);
					variables['has_totp'] =
						(await getUser2faSecret(profile, fastify)) !== '';
				} else if (page === 'lobby_admin') {
					const user = await checkAuth(req, true, fastify);
					if (!user)
						return reply.code(401).send({ error: 'Unauthorized' });
					const existingGame = runningGames.find(
						(g) => g.admin.id === user!.id
					);
					if (!existingGame)
						throw new Error('User has no game yet! Create one first.');
					const admin = existingGame.players.find(
						(p) => p instanceof UserPlayer && p.user.id == user.id
					);
					const players = [];
					for (const player of existingGame.players) {
						players.push(player.formatStateForClients());
					}
					if (!admin) throw new Error('No Admin found!');
					admin.joined = true;
					variables['initial'] = true;
					variables['ownerName'] = user!.displayname;
					variables['players'] = players;
					variables['gameSettings'] = existingGame.config;
					variables['selfId'] = admin.playerId;
					variables['localPlayerId'] = -1;
					variables['tournamentTree'] = existingGame.tournament
						? existingGame.tournament.getBracketJSON()
						: null;
					variables['availableMaps'] =
						existingGame.availableMaps ||
						(await getAvailableMaps(fastify));
				} else if (page === 'error') {
					variables['err_code'] = 404;
					variables['err_message'] = defaultError;
				}
			} catch (err) {
				variables['err_code'] = errorCode;
				if (err instanceof Error) {
					variables['err_message'] = err.message;
				} else {
					variables['err_message'] = 'An unknown error occurred';
				}
				return reply.code(errorCode).view(
					'error.ejs',
					{ ...variables, t: req.t },
					{
						layout: layoutOption,
					}
				);
			}

			if (['add_friends'].includes(page) && !variables['isAuthenticated'])
				return reply.view(
					`no_access.ejs`,
					{ ...variables, t: req.t },
					{
						layout: layoutOption,
					}
				);
			else
				return reply.view(
					`${page}`,
					{ ...variables, t: req.t },
					{
						layout: layoutOption,
					}
				);
		}
	);
};

export default pages;
