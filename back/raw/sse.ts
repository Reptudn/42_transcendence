import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import ejs from 'ejs';
import path from 'path';
import logger from './logger.js';
import { __dirname } from './main.js';
import { checkAuth } from './routes/api/auth.js';
import { User } from './db/database.js';

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

		console.log('Established sse conn');

		reply.raw.write(`data: ${JSON.stringify({ type: 'log', message: 'Connection with Server established' })}\n\n`);

		connectedClients.set(user.id, reply);

		sendPopupToClient(user.id, 'BEEP BOOP BEEEEEP ~011001~ Server Connection established', '-> it\'s pongin\' time!', 'green', 'testCallback()', 'HELL YEAH BEEP BOOP BACK AT YOU DUDE');

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
		const { title, description, color, callback, buttonName } = request.body as { title: string, description: string, color: string, callback: string, buttonName: string };
		sendPopupToClient(user.id, title, description, color, callback, buttonName);
		reply.send({ message: 'Popup sent' });
	});
}

export const sendRawToClient = (user: User, data: any) => {
	const client = connectedClients.get(user.id);
	if (client) {
		client.raw.write(data);
	} else {
		console.error(`Client ${user.displayname} not found in connected users.`);
	}
};
export function sendPopupToClient(id: number, title: string = 'Info', description: string = '', color: string = 'black', callback: string = '', buttonName: string = 'PROCEED') {
	let reply = connectedClients.get(id);
	if (!reply) {
		logger.error(`Client with id ${id} not found in connected users.`);
		return;
	}
	try {
		ejs.renderFile(path.join(__dirname, `../../front/layouts/partial/popup.ejs`), { title, description, color, callback, buttonName }, (err, str) => {
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
setInterval(() => {
	connectedClients.forEach((reply: FastifyReply, user: number) => {
		sendPopupToClient(user, 'PING', '-> it\'s pongin\' time!', 'pink', 'testCallback()');
	});
}, 30000);