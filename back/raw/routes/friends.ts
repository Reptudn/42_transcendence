import { FastifyInstance } from "fastify";
import { sendFriendRequest, acceptFriendRequest, removeFriendship, getFriends } from '../db/db_friends.js';
import { searchUsers } from '../db/db_users.js';
import { connectedClients, sendPopupToClient } from '../sse.js';

export async function friendRoutes(app: FastifyInstance) {

	app.get('/friends/search', async (req: any, reply: any) => {
		const query: string = req.query.q || '';
		const results = query ? await searchUsers(query) : [];

		// TODO: Exclude self
		// TODO: Limit result count

		return reply.send({ results });
	});

	app.post('/friends/request', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const requesterId: number = req.user.id;
		const { requestedId } = req.body;
		try {
			const requestId = await sendFriendRequest(requesterId, requestedId);
			if (connectedClients && connectedClients.has(requestedId)) {
				sendPopupToClient(
					requestedId,
					'Friend Request',
					`User ${req.user.username} wishes to be your friend!`,
					'blue',
					`acceptFriendRequest(${requestId})`,
					'Accept'
				);
			}
			reply.send({ message: 'Friend request sent' });
		} catch (err: any) {
			reply.code(400).send({ message: err.message });
		}
	});

	app.post('/friends/accept', async (req: any, reply: any) => {
		const { requestId } = req.body;
		try {
			await acceptFriendRequest(requestId);
			reply.send({ message: 'Friend request accepted' });
		} catch (err: any) {
			reply.code(400).send({ message: err.message });
		}
	});

	app.post('/friends/remove', async (req: any, reply: any) => {
		const userId: number = req.user.id;
		const { friendId } = req.body;
		try {
			await removeFriendship(userId, friendId);
			reply.send({ message: 'Friend removed' });
		} catch (err: any) {
			reply.code(400).send({ message: err.message });
		}
	});
}
