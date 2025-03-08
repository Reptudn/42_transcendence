import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import ejs from 'ejs';
import path from 'path';
import logger from './logger.js';
import { checkAuth } from './routes/api/auth.js';
import { User } from './db/database.js';
import { getPendingFriendRequestsForUser, removeFriendship } from './db/db_friends.js';
import { getUserById, getNameForUser } from './db/db_users.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export let connectedClients: Map<number, FastifyReply> = new Map();

export async function eventRoutes(app: FastifyInstance) {

	app.get('/notify', { preValidation: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		console.log("Client connected with notify");

		const user: User | null = await checkAuth(request);
		if (!user) {
			reply.raw.end();
			console.log("Client not authenticated");
			return;
		}

		reply.raw.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Transfer-Encoding': 'identity'
		});

		reply.raw.write(`data: ${JSON.stringify({ type: 'log', message: 'Connection with Server established' })}\n\n`);

		connectedClients.set(user.id, reply);

		sendPopupToClient(user.id, 'BEEP BOOP BEEEEEP ~011001~ Server Connection established', '-> it\'s pongin\' time!', 'green');

		const openFriendRequests = await getPendingFriendRequestsForUser(user.id)
		for (const request of openFriendRequests) {
			const requester: User | null = await getUserById(request.requester_id);
			if (requester) {
				sendPopupToClient(user.id, 'Friend Request', `<a href="/partial/pages/profile/${request.requester_id}" target="_blank">User ${await getNameForUser(request.requester_id) || requester.username}</a> wishes to be your friend!`, 'blue', `acceptFriendRequest(${request.id})`, 'Accept', `declineFriendRequest(${request.id})`, 'Decline');
			} else {
				logger.error(`User with id ${request.requester_id} not found.`);
				removeFriendship(request.requester_id, request.requested_id);
			}
		}

		request.raw.on('close', () => {
			connectedClients.delete(user.id);
			console.log("Client disconnected", user.id);
			reply.raw.end();
		});

		reply.raw.on('error', (err) => {
			app.log.error('SSE error:', err);
		});
	});

	app.post('/notify/send', { preValidation: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		const user: User | null = await checkAuth(request);
		if (!user) {
			reply.send({ message: 'Not authenticated' });
			return;
		}
		const { title, description, color, callback1, buttonName1, callback2, buttonName2 } = request.body as { title: string, description: string, color: string, callback1: string, buttonName1: string, callback2: string, buttonName2: string };
		sendPopupToClient(user.id, title, description, color, callback1, buttonName1, callback2, buttonName2);
		reply.send({ message: 'Popup sent' });
	});
}

export const sendRawToClient = (userId: number, data: any) => {
	const client = connectedClients.get(userId);
	if (client) {
		client.raw.write(data);
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
	buttonName2: string = 'CANCEL') {
	let reply = connectedClients.get(id);
	if (!reply) {
		logger.error(`Client with id ${id} not found in connected users.`);
		return;
	}
	try {
		ejs.renderFile(path.join(__dirname, `../../front/layouts/partial/misc/popup.ejs`), { title, description, color, callback1, buttonName1, callback2, buttonName2, "isAchievement": false }, (err, str) => {
			if (err) {
				logger.error("Error rendering view:", err);
				reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: err })}\n\n`);
			} else {
				reply.raw.write(`data: ${JSON.stringify({ type: 'popup', html: str })}\n\n`);
			}
		});
	} catch (err) {
		logger.error("Error rendering view:", err);
		reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: err })}\n\n`);
	}
}
export function sendAchievementToClient(
	id: number,
	title: string,
	description: string,
	firstTitle: string,
	secondTitle: string,
	thirdTitle: string) {
	let reply = connectedClients.get(id);
	if (!reply) {
		logger.error(`Client with id ${id} not found in connected users.`);
		return;
	}
	try {
		ejs.renderFile(path.join(__dirname, `../../front/layouts/partial/misc/popup.ejs`), { title, description, 'color': 'purple', 'callback1': '', 'buttonName1': '', 'callback2': '', 'buttonName2': '', 'isAchievement': true, firstTitle, secondTitle, thirdTitle }, (err, str) => {
			if (err) {
				logger.error("Error rendering view:", err);
				reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: err })}\n\n`);
			} else {
				reply.raw.write(`data: ${JSON.stringify({ type: 'popup', html: str })}\n\n`);
			}
		});
	} catch (err) {
		logger.error("Error rendering view:", err);
		reply.raw.write(`data: ${JSON.stringify({ type: 'error', message: err })}\n\n`);
	}
}
