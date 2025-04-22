import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import ejs from 'ejs';
import path from 'path';
import {
	getPendingFriendRequestsForUser,
	removeFriendship,
} from '../database/friends.js';
import { getUserById, getNameForUser } from '../database/users.js';
import { checkAuth } from '../auth/auth.js';

export let connectedClients: Map<number, FastifyReply> = new Map();

export async function eventRoutes(fastify: FastifyInstance) {
	fastify.get(
		'/notify',
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
		'/notify/send',
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
}

export const sendRawToClient = (userId: number, data: any) => {
	console.log('Sending raw data to client', userId, data);
	const reply = connectedClients.get(userId);
	if (reply) {
		if (!data.endsWith('\n\n')) {
			data += '\n\n';
		}
		reply.raw.write(data);
	} else {
		console.error(`User ${userId} not found in connected users.`);
	}
};
export function sendPopupToClient(
	id: number,
	title: string = 'Info',
	description: string = '',
	color: string = 'black',
	callback1: string = '',
	buttonName1: string = 'PROCEED',
	callback2: string = '',
	buttonName2: string = 'CANCEL'
) {
	let reply = connectedClients.get(id);
	if (!reply) {
		console.error(`Client with id ${id} not found in connected users.`);
		return;
	}
	try {
		ejs.renderFile(
			path.join(__dirname, `../../../public/pages/misc/popup.ejs`),
			{
				title,
				description,
				color,
				callback1,
				buttonName1,
				callback2,
				buttonName2,
				isAchievement: false,
			},
			(err, str) => {
				if (err) {
					console.error('Error rendering view:', err);
					reply.raw.write(
						`data: ${JSON.stringify({
							type: 'error',
							message: err,
						})}\n\n`
					);
				} else {
					reply.raw.write(
						`data: ${JSON.stringify({
							type: 'popup',
							html: str,
						})}\n\n`
					);
				}
			}
		);
	} catch (err) {
		console.error('Error rendering view:', err);
		reply.raw.write(
			`data: ${JSON.stringify({ type: 'error', message: err })}\n\n`
		);
	}
}
export function sendAchievementToClient(
	id: number,
	title: string,
	description: string,
	firstTitle: string,
	secondTitle: string,
	thirdTitle: string
) {
	let reply = connectedClients.get(id);
	if (!reply) {
		console.error(`Client with id ${id} not found in connected users.`);
		return;
	}
	try {
		ejs.renderFile(
			path.join(__dirname, `../../../public/pages/misc/popup.ejs`),
			{
				title,
				description,
				color: 'purple',
				callback1: '',
				buttonName1: '',
				callback2: '',
				buttonName2: '',
				isAchievement: true,
				firstTitle,
				secondTitle,
				thirdTitle,
			},
			(err, str) => {
				if (err) {
					console.error('Error rendering view:', err);
					reply.raw.write(
						`data: ${JSON.stringify({
							type: 'error',
							message: err,
						})}\n\n`
					);
				} else {
					reply.raw.write(
						`data: ${JSON.stringify({
							type: 'popup',
							html: str,
						})}\n\n`
					);
				}
			}
		);
	} catch (err) {
		console.error('Error rendering view:', err);
		reply.raw.write(
			`data: ${JSON.stringify({ type: 'error', message: err })}\n\n`
		);
	}
}
