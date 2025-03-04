import { FastifyInstance } from "fastify";
import { createFriendRequest, acceptFriendRequest, rejectFriendRequest, getFriendRequest, removeFriendship } from '../../db/db_friends.js';
import { connectedClients, sendPopupToClient } from '../../sse.js';
import { getNameForUser } from "../../db/db_users.js";
import { checkAuth } from "./auth.js";

// TODO: make sure not only that the users are valid users of the website, but also actually involved in the friendship everywhere
// TODO: stop friendships with yourself
export async function friendRoutes(app: FastifyInstance) {

	app.post('/api/friends/request', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const requesterId: number = Number(req.user.id);
		const requestedId: number = Number(req.body.requestId);

		const pendingRequest = await getFriendRequest(requesterId, requestedId);
		if (pendingRequest) {
			if (pendingRequest.requested_id == requesterId) {
				await acceptFriendRequest(pendingRequest.id);
				reply.send({ message: 'Friend request accepted' });
				return reply.code(200);
			} else {
				reply.code(400).send({ message: 'Friend request already sent' });
				return;
			}
		}

		try {
			const requestId = await createFriendRequest(requesterId, requestedId);

			if (connectedClients && connectedClients.has(requestedId)) {
				sendPopupToClient(
					requestedId,
					'Friend Request',
					`<a href="/partial/pages/profile/${requesterId}" target="_blank">User ${await getNameForUser(requesterId) || requesterId}</a> wishes to be your friend!`,
					'blue',
					`acceptFriendRequest(${requestId})`,
					'Accept',
					`declineFriendRequest(${requestId})`,
					'Decline'
				);
			} else {
				reply.code(200).send({ message: 'User not connected, sent friend request will be received later.' });
			}
			reply.code(200).send({ message: 'Friend request sent' });
		} catch (err: any) {
			reply.code(400).send({ message: err.message });
		}
	});

	// TODO: send message to friend that request was accepted
	app.post('/api/friends/accept', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const { requestId } = req.body;
		try {
			await acceptFriendRequest(requestId);
			reply.send({ message: 'Friend request accepted' });
		} catch (err: any) {
			reply.code(400).send({ message: err.message });
		}
	});

	app.post('/api/friends/decline', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const { requestId } = req.body;
		try {
			await rejectFriendRequest(requestId);
			reply.send({ message: 'Friendship removed' });
		} catch (err: any) {
			reply.code(400).send({ message: err.message });
		}
	});

	app.post('/api/friends/remove', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const { friendId } = req.body;
		const user = await checkAuth(req);
		if (!user)
			return reply.code(401).send({ message: 'Unauthorized' });
		try {
			await removeFriendship(user.id, friendId);
			reply.send({ message: 'Friendship removed' });
		} catch (err: any) {
			reply.code(400).send({ message: err.message });
		}
	});
}
