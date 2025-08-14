import { FastifyPluginAsync } from 'fastify';
import {
	getFriends,
	getPendingFriendRequestsForUser,
} from '../../../services/database/friends';
import { searchUsers } from '../../../services/database/users';

const friends: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get(
		'/search',
		{
			preValidation: [fastify.authenticate],
			schema: {
				querystring: {
					type: 'object',
					properties: {
						q: { type: 'string', minLength: 0, maxLength: 100 },
					},
					required: [],
				},
			},
		},
		async (req: any, reply: any) => {
			const query: string = req.query.q || '';
			let results = query ? await searchUsers(query, fastify) : [];
			results.filter((user: any) => user.id !== req.user.id);
			results = results.slice(0, 50);

			const friends = await getFriends(req.user.id, fastify);
			const pendingRequests = await getPendingFriendRequestsForUser(
				req.user.id,
				fastify
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

			return reply.view('misc/friend_cards.ejs', { results });
		}
	);
};

export default friends;
