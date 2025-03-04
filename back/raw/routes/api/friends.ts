import { FastifyInstance } from "fastify";
import { createFriendRequest, acceptFriendRequest, rejectFriendRequest, getFriendRequest, removeFriendship, getFriendRequestById } from '../../db/db_friends.js';
import { connectedClients, sendPopupToClient } from '../../sse.js';
import { getNameForUser } from "../../db/db_users.js";
import { checkAuth } from "./auth.js";

export async function friendRoutes(app: FastifyInstance) {

	app.post('/api/friends/request', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const requesterId: number = Number(req.user.id);
		const requestedId: number = Number(req.body.requestId);

		if (requesterId === requestedId) {
			reply.code(400).send({ message: 'You cannot send a friend request to yourself' });
			return;
		}

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

	app.post('/api/friends/accept', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const { requestId } = req.body;
		const request = await getFriendRequestById(requestId);
		if (!request) {
			return reply.code(404).send({ message: 'Request not found' });
		}
		if (request.requested_id != req.user.id) {
			return reply.code(401).send({ message: 'Unauthorized' });
		}
		try {
			await acceptFriendRequest(requestId);

			const request = await getFriendRequestById(requestId);
			if (request) {
				sendPopupToClient(request.requester_id, 'Friend Request Accepted', `Your friend request was accepted by <a href="/partial/pages/profile/${request.requested_id}" target="_blank">User ${await getNameForUser(request.requested_id) || request.requested_id}</a>!`, 'blue');
			}

			reply.send({ message: 'Friend request accepted' });
		} catch (err: any) {
			reply.code(400).send({ message: err.message });
		}
	});

	app.post('/api/friends/decline', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const { requestId } = req.body;
		const request = await getFriendRequestById(requestId);
		if (!request) {
			return reply.code(404).send({ message: 'Request not found' });
		}
		if (request.requested_id != req.user.id) {
			return reply.code(401).send({ message: 'Unauthorized' });
		}
		try {
			await rejectFriendRequest(requestId);
			reply.send({ message: 'Friendship removed' });
		} catch (err: any) {
			reply.code(400).send({ message: err.message });
		}
	});

	app.post('/api/friends/remove', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const { friendId } = req.body;
		const request = await getFriendRequest(req.user.id, friendId);
		if (!request) {
			return reply.code(404).send({ message: 'Friendship not found' });
		}
		if (request.requested_id != req.user.id && request.requester_id != req.user.id) {
			return reply.code(401).send({ message: 'Unauthorized' });
		}
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
