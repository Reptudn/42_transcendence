import { FastifyPluginAsync } from 'fastify';
import {
	getFriends,
	getPendingFriendRequestsForUser,
} from '../../../services/database/db_friends';
import { searchUsers } from '../../../services/database/db_users';

const friends: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get(
		'/search',
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

export default friends;
