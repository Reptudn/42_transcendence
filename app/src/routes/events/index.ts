import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { sendPopupToClient } from '../../services/sse/popup';
import { checkAuth } from '../../services/auth/auth';
import {
	getPendingFriendRequestsForUser,
	removeFriendship,
} from '../../services/database/friends';
import { getUserById, getNameForUser } from '../../services/database/users';
import {
	connectedClients,
	sendSseHeaders,
	sendSseMessage,
} from '../../services/sse/handler';

const sendServerNotificationSchema = {
	type: 'object',
	properties: {
		title: {
			type: 'string',
			minLength: 1,
			maxLength: 100,
			errorMessage: {
				type: 'Title must be a string.',
				minLength: 'Title must not be empty.',
				maxLength: 'Title must not exceed 100 characters.',
			},
		},
		description: {
			type: 'string',
			minLength: 1,
			maxLength: 500,
			errorMessage: {
				type: 'Description must be a string.',
				minLength: 'Description must not be empty.',
				maxLength: 'Description must not exceed 500 characters.',
			},
		},
		color: {
			type: 'string',
			minLength: 1,
			maxLength: 20,
			errorMessage: {
				type: 'Color must be a string.',
				minLength: 'Color must not be empty.',
				maxLength: 'Color must not exceed 20 characters.',
			},
		},
		callback1: {
			type: 'string',
			minLength: 1,
			maxLength: 100,
			errorMessage: {
				type: 'Callback1 must be a string.',
				minLength: 'Callback1 must not be empty.',
				maxLength: 'Callback1 must not exceed 100 characters.',
			},
		},
		buttonName1: {
			type: 'string',
			minLength: 1,
			maxLength: 50,
			errorMessage: {
				type: 'ButtonName1 must be a string.',
				minLength: 'ButtonName1 must not be empty.',
				maxLength: 'ButtonName1 must not exceed 50 characters.',
			},
		},
		callback2: {
			type: 'string',
			minLength: 1,
			maxLength: 100,
			errorMessage: {
				type: 'Callback2 must be a string.',
				minLength: 'Callback2 must not be empty.',
				maxLength: 'Callback2 must not exceed 100 characters.',
			},
		},
		buttonName2: {
			type: 'string',
			minLength: 1,
			maxLength: 50,
			errorMessage: {
				type: 'ButtonName2 must be a string.',
				minLength: 'ButtonName2 must not be empty.',
				maxLength: 'ButtonName2 must not exceed 50 characters.',
			},
		},
	},
	required: [
		'title',
		'description',
		'color',
		'callback1',
		'buttonName1',
		'callback2',
		'buttonName2',
	],
	additionalProperties: false,
	errorMessage: {
		required: {
			title: 'Title is required.',
			description: 'Description is required.',
			color: 'Color is required.',
			callback1: 'Callback1 is required.',
			buttonName1: 'ButtonName1 is required.',
			callback2: 'Callback2 is required.',
			buttonName2: 'ButtonName2 is required.',
		},
		additionalProperties: 'No additional properties are allowed.',
	},
};

const notify: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get(
		'/',
		{
			preValidation: [fastify.authenticate],
			schema: { response: { 200: { type: 'string' } } },
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			console.log('Client connected with notify');

			const user: User | null = await checkAuth(request, false, fastify);
			if (!user) {
				reply.raw.end();
				console.log('Client not authenticated');
				return;
			}

			sendSseHeaders(reply);

			sendSseMessage(reply, 'log', 'Connection with Server established');

			connectedClients.set(user.id, reply);

			sendPopupToClient(
				fastify,
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
						fastify,
						user.id,
						'Friend Request',
						`<a href="/partial/pages/profile/${
							request.requester_id
						}" target="_blank">User ${
							(await getNameForUser(request.requester_id, fastify)) ||
							requester.username
						}</a> wishes to be your friend!`,
						'blue',
						`acceptFriendRequest(${request.id})`,
						'Accept',
						`declineFriendRequest(${request.id})`,
						'Decline'
					);
				} else {
					console.error(`User with id ${request.requester_id} not found.`);
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
		{
			preValidation: [fastify.authenticate],
			schema: { body: sendServerNotificationSchema },
		},
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
				fastify,
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
