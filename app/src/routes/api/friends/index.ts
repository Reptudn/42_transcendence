import { FastifyPluginAsync } from 'fastify';
import {
	getFriendRequest,
	acceptFriendRequest,
	createFriendRequest,
	getFriendRequestById,
	rejectFriendRequest,
	removeFriendship,
} from '../../../services/database/friends';
import { getNameForUser } from '../../../services/database/users';
import { sendPopupToClient } from '../../../services/sse/popup';
import { checkAuth } from '../../../services/auth/auth';
import { connectedClients } from '../../../services/sse/handler';

const friends: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post(
		'/request',
		{ preValidation: [fastify.authenticate] },
		async (req: any, reply: any) => {
			const requesterId: number = Number(req.user.id);
			const requestedId: number = Number(req.body.requestId);

			if (requesterId === requestedId) {
				reply.code(400).send({
					message: 'You cannot send a friend request to yourself',
				});
				return;
			}

			const pendingRequest = await getFriendRequest(
				requesterId,
				requestedId, fastify
			);
			if (pendingRequest) {
				if (pendingRequest.requested_id == requesterId) {
					await acceptFriendRequest(pendingRequest.id, fastify);
					reply.send({ message: 'Friend request accepted' });
					return reply.code(200);
				} else {
					reply
						.code(400)
						.send({ message: 'Friend request already sent' });
					return;
				}
			}

			try {
				const requestId = await createFriendRequest(
					requesterId,
					requestedId, fastify
				);

				if (connectedClients && connectedClients.has(requestedId)) {
					sendPopupToClient(
						requestedId,
						'Friend Request',
						`<a href="/partial/pages/profile/${requesterId}" target="_blank">User ${
							(await getNameForUser(requesterId, fastify)) || requesterId
						}</a> wishes to be your friend!`,
						'blue',
						`acceptFriendRequest(${requestId})`,
						'Accept',
						`declineFriendRequest(${requestId})`,
						'Decline'
					);
				} else {
					reply.code(200).send({
						message:
							'User not connected, sent friend request will be received later.',
					});
				}
				reply.code(200).send({ message: 'Friend request sent' });
			} catch (err: any) {
				reply.code(400).send({ message: err.message });
			}
		}
	);

	fastify.post(
		'/accept',
		{ preValidation: [fastify.authenticate] },
		async (req: any, reply: any) => {
			const { requestId } = req.body;
			const request = await getFriendRequestById(requestId, fastify);
			if (!request) {
				return reply.code(404).send({ message: 'Request not found' });
			}
			if (request.requested_id != req.user.id) {
				return reply.code(401).send({ message: 'Unauthorized' });
			}
			try {
				await acceptFriendRequest(requestId, fastify);

				const request = await getFriendRequestById(requestId, fastify);
				if (request) {
					sendPopupToClient(
						request.requester_id,
						'Friend Request Accepted',
						`Your friend request was accepted by <a href="/partial/pages/profile/${
							request.requested_id
						}" target="_blank">User ${
							(await getNameForUser(request.requested_id, fastify)) ||
							request.requested_id
						}</a>!`,
						'blue'
					);
				}

				reply.send({ message: 'Friend request accepted' });
			} catch (err: any) {
				reply.code(400).send({ message: err.message });
			}
		}
	);

	fastify.post(
		'/decline',
		{ preValidation: [fastify.authenticate] },
		async (req: any, reply: any) => {
			const { requestId } = req.body;
			const request = await getFriendRequestById(requestId, fastify);
			if (!request) {
				return reply.code(404).send({ message: 'Request not found' });
			}
			if (request.requested_id != req.user.id) {
				return reply.code(401).send({ message: 'Unauthorized' });
			}
			try {
				await rejectFriendRequest(requestId, fastify);
				reply.send({ message: 'Friendship removed' });
			} catch (err: any) {
				reply.code(400).send({ message: err.message });
			}
		}
	);

	fastify.post(
		'/remove',
		{ preValidation: [fastify.authenticate] },
		async (req: any, reply: any) => {
			const { friendId } = req.body;
			const request = await getFriendRequest(req.user.id, friendId, fastify);
			if (!request) {
				return reply
					.code(404)
					.send({ message: 'Friendship not found' });
			}
			if (
				request.requested_id != req.user.id &&
				request.requester_id != req.user.id
			) {
				return reply.code(401).send({ message: 'Unauthorized' });
			}
			const user = await checkAuth(req, false, fastify);
			if (!user) return reply.code(401).send({ message: 'Unauthorized' });
			try {
				await removeFriendship(user.id, friendId, fastify);
				reply.send({ message: 'Friendship removed' });
			} catch (err: any) {
				reply.code(400).send({ message: err.message });
			}
		}
	);
};

export default friends;
