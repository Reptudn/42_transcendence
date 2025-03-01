import { FastifyInstance } from "fastify";
import { sendFriendRequest, acceptFriendRequest, removeFriendship, getFriends } from '../db/db_friends.js';
import { searchUsers } from '../db/db_users.js';
import { connectedClients, sendPopupToClient } from '../sse.js';

export async function friendRoutes(app: FastifyInstance) {

	// TODO: Exclude self
	// TODO: Limit result count
	// TODO: if other user is already a friend, show that
	app.get('/friends/search', async (req: any, reply: any) => {
		const query: string = req.query.q || '';
		const results = query ? await searchUsers(query) : [];

		return reply.send({ results });
	});

	// TODO: if other user is already a friend, just accept, dont send request
	// TODO: add friend request declining
	app.post('/friends/request', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const requesterId: number = req.user.id;
		const requestedId = req.body.requestId;
		try {
			const requestId = await sendFriendRequest(requesterId, requestedId);
			console.log('connectedClients: ', connectedClients);
			console.log('requestedId: ', requestedId);
			if (connectedClients && connectedClients.has(requestedId)) {
				sendPopupToClient(
					requestedId,
					'Friend Request',
					`User ${req.user.username} wishes to be your friend!`,
					'blue',
					`acceptFriendRequest(${requestId})`,
					'Accept'
				);
			} else {
				reply.send({ message: 'Couldn\'t send friend request, user not connected' });
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
