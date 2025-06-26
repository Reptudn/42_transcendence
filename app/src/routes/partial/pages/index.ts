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
import { connectedClients } from '../../../services/sse/handler';

const pages: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get(
		'/:page/:username?',
		{
			schema: {
				params: {
					type: 'object',
					properties: {
						page: { type: 'string', minLength: 1, maxLength: 100 },
						username: { type: 'string', minLength: 1, maxLength: 100 },
					},
					required: ['page'],
				},
			},
		},
		async (req: any, reply: any) => {
			const { page, username } = req.params;
			const loadpartial = req.headers['loadpartial'] === 'true';
			const layoutOption = loadpartial ? false : 'layouts/basic.ejs';
			const user = await checkAuth(req, false, fastify);

			let variables: { [key: string]: any } = {};
			variables['isAuthenticated'] = user != null;
			if (user != null)
				variables['name'] = user.displayname || user.username;
			else variables['name'] = 'Guest';

			let errorCode: number = 418;

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
					let isSelf = profileId === req.user.id;
					
					profile.profile_picture =
						'/profile/' + profileId + '/picture';
					variables['user'] = profile;
					variables['isSelf'] = isSelf;
					variables['title'] = await getUserTitleString(
						profile.id,
						fastify
					);

					const unlockedAchievements = await getUserAchievements(
						profileId,
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

					let friends = await getFriends(profileId, fastify);
					variables['friends'] = friends;
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
				} else if (page === 'game_setup') {
					await checkAuth(req, true, fastify);
					const user_id = req.user.id;
					let friends = await getFriends(user_id, fastify);
					friends = friends.filter((friend) =>
						connectedClients.has(friend.id)
					);
					variables['friends'] = friends;
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
