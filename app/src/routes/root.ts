import { FastifyPluginAsync } from 'fastify';
import {
	getUserAchievements,
	getAllAchievements,
} from '../services/database/db_achievements';
import {
	getFriends,
	getPendingFriendRequestsForUser,
} from '../services/database/db_friends';
import {
	getUserById,
	getUserTitleString,
	getUserTitle,
	getUserTitlesForTitle,
	searchUsers,
} from '../services/database/db_users';
import { connectedClients } from '../services/sse/sse';
import { checkAuth } from '../services/auth/auth';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/', async (req: any, reply: any) => {
		const isAuthenticated = (await checkAuth(req)) != null;
		return reply.view(
			'partial/pages/index.ejs',
			{ name: 'Jonas', isAuthenticated },
			{ layout: 'basic.ejs' }
		);
	});

	fastify.get(
		'/partial/pages/:page/:profile_id?',
		async (req: any, reply: any) => {
			const page = req.params.page;
			const loadpartial = req.headers['loadpartial'] === 'true';
			const layoutOption = loadpartial ? false : 'basic.ejs';
			const user = await checkAuth(req);

			let variables: { [key: string]: any } = {};
			variables['isAuthenticated'] = user != null;
			if (user != null)
				variables['name'] = user.displayname || user.username;
			else variables['name'] = 'Guest';

			let errorCode: number = 418;

			try {
				if (page === 'profile') {
					await checkAuth(req, true);
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
					let profile = await getUserById(profileId);
					if (!profile) {
						errorCode = 404;
						throw new Error('User not found');
					}
					profile.profile_picture =
						'/profile/' + profileId + '/picture';
					variables['user'] = profile;
					variables['isSelf'] = isSelf;
					variables['title'] = await getUserTitleString(profile.id);

					const unlockedAchievements = await getUserAchievements(
						profileId
					);
					const allAchievements = await getAllAchievements();
					const achievements = allAchievements.map((ach) => ({
						...ach,
						unlocked: unlockedAchievements.some(
							(ua) => ua.id === ach.id
						),
					}));
					variables['achievements'] = achievements;
					variables['unlockedCount'] = unlockedAchievements.length;
					variables['totalCount'] = allAchievements.length;

					let friends = await getFriends(profileId);
					variables['friends'] = friends;
				} else if (page === 'edit_profile') {
					let profile = await checkAuth(req, true);
					if (!profile) {
						errorCode = 404;
						throw new Error('User not found');
					}
					variables['user'] = profile;

					variables['firstTitle'] = await getUserTitle(profile.id, 1);
					variables['secondTitle'] = await getUserTitle(
						profile.id,
						2
					);
					variables['thirdTitle'] = await getUserTitle(profile.id, 3);

					variables['firstTitles'] = await getUserTitlesForTitle(
						1,
						profile.id
					);
					variables['secondTitles'] = await getUserTitlesForTitle(
						2,
						profile.id
					);
					variables['thirdTitles'] = await getUserTitlesForTitle(
						3,
						profile.id
					);
				} else if (page === 'game_setup') {
					await checkAuth(req, true);
					const user_id = req.user.id;
					let friends = await getFriends(user_id);
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
				return reply
					.code(errorCode)
					.view('partial/pages/error.ejs', variables, {
						layout: layoutOption,
					});
			}

			if (['add_friends'].includes(page) && !variables['isAuthenticated'])
				return reply.view(`partial/pages/no_access.ejs`, variables, {
					layout: layoutOption,
				});
			else
				return reply.view(`partial/pages/${page}.ejs`, variables, {
					layout: layoutOption,
				});
		}
	);

	fastify.get('/partial/menu', async (req: any, reply: any) => {
		const isAuthenticated = (await checkAuth(req)) != null;
		const menuTemplate = isAuthenticated
			? 'partial/menu/loggedin.ejs'
			: 'partial/menu/guest.ejs';
		return reply.view(menuTemplate, { name: 'Freddy' });
	});

	fastify.get(
		'/partial/friends/search',
		{ preValidation: [fastify.authenticate] },
		async (req: any, reply: any) => {
			const query: string = req.query.q || '';
			let results = query ? await searchUsers(query) : [];
			results.filter((user: any) => user.id !== req.user.id);
			results = results.slice(0, 50);

			const friends = await getFriends(req.user.id);
			const pendingRequests = await getPendingFriendRequestsForUser(
				req.user.id
			);
			const pendingIds = pendingRequests.map(
				(pending: any) => pending.requested_id
			);

			results = results.filter((result: any) => {
				const isFriend = friends.some(
					(friend: any) => friend.id === result.id
				);
				const isPending = pendingIds.includes(result.id);
				const isSelf = result.id === req.user.id;
				return !isFriend && !isPending && !isSelf;
			});

			return reply.view('partial/misc/friend_cards.ejs', { results });
		}
	);
};

export default root;
