import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { sendPopupToClient } from '../../services/sse/popup';
import { checkAuth } from '../../services/auth/auth';
import {
	getPendingFriendRequestsForUser,
	removeFriendship,
} from '../../services/database/friends';
import { getUserById, getNameForUser } from '../../services/database/users';
import { connectedClients } from '../../services/sse/handler';

const notify: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get(
		'/',
		{ preValidation: [fastify.authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			console.log('Client connected with notify');

			const user: User | null = await checkAuth(request, false, fastify);
			if (!user) {
				reply.raw.end();
				console.log('Client not authenticated');
				return;
			}

			reply.raw.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Transfer-Encoding': 'identity',
			});

			reply.raw.write(
				`data: ${JSON.stringify({
					type: 'log',
					message: 'Connection with Server established',
				})}\n\n`
			);

			connectedClients.set(user.id, reply);

			sendPopupToClient(
				user.id,
				'BEEP BOOP BEEEEEP ~011001~ Server Connection established',
				"-> it's pongin' time!",
				'green'
			);

			const openFriendRequests = await getPendingFriendRequestsForUser(
				user.id,
				fastify
			);
			for (const request of openFriendRequests) {
				const requester: User | null = await getUserById(
					request.requester_id,
					fastify
				);
				if (requester) {
					sendPopupToClient(
						user.id,
						'Friend Request',
						`<a href="/partial/pages/profile/${
							request.requester_id
						}" target="_blank">User ${
							(await getNameForUser(
								request.requester_id,
								fastify
							)) || requester.username
						}</a> wishes to be your friend!`,
						'blue',
						`acceptFriendRequest(${request.id})`,
						'Accept',
						`declineFriendRequest(${request.id})`,
						'Decline'
					);
				} else {
					console.error(
						`User with id ${request.requester_id} not found.`
					);
					removeFriendship(
						request.requester_id,
						request.requested_id,
						fastify
					);
				}
			}

			request.raw.on('close', () => {
				connectedClients.delete(user.id);
				console.log('Client disconnected', user.id);
				reply.raw.end();
			});

			reply.raw.on('error', (err) => {
				fastify.log.error('SSE error:', err);
			});
		}
	);

	fastify.post(
		'/send',
		{ preValidation: [fastify.authenticate] },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const user: User | null = await checkAuth(request, false, fastify);
			if (!user) {
				reply.send({ message: 'Not authenticated' });
				return;
			}
			const {
				title,
				description,
				color,
				callback1,
				buttonName1,
				callback2,
				buttonName2,
			} = request.body as {
				title: string;
				description: string;
				color: string;
				callback1: string;
				buttonName1: string;
				callback2: string;
				buttonName2: string;
			};
			sendPopupToClient(
				user.id,
				title,
				description,
				color,
				callback1,
				buttonName1,
				callback2,
				buttonName2
			);
			reply.send({ message: 'Popup sent' });
		}
	);
};

export default notify;
