import { FastifyInstance } from "fastify";
import { sendFriendRequest, acceptFriendRequest, removeFriendship, getPendingFriendRequest } from '../../db/db_friends.js';
import { connectedClients, sendPopupToClient } from '../../sse.js';

export async function friendRoutes(app: FastifyInstance) {

	app.post('/api/friends/request', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const requesterId: number = Number(req.user.id);
		const requestedId: number = Number(req.body.requestId);

		const pendingRequest = await getPendingFriendRequest(requesterId, requestedId);
		if (pendingRequest) {
			await acceptFriendRequest(pendingRequest.id);
			reply.send({ message: 'Friend request accepted' });
			return reply.code(200);
		}

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

	app.post('/api/friends/accept', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const { requestId } = req.body;
		try {
			await acceptFriendRequest(requestId);
			reply.send({ message: 'Friend request accepted' });
		} catch (err: any) {
			reply.code(400).send({ message: err.message });
		}
	});

	app.post('/api/friends/remove', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
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
