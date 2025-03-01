import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import ejs from 'ejs';
import path from 'path';
import logger from './logger.js';
import { __dirname, app } from './main.js';

export let connectedClients: Map<number, FastifyReply> = new Map();

export async function eventRoutes(app: FastifyInstance) {
	app.get('/notify', (request: FastifyRequest, reply: FastifyReply) => {
		reply.raw.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Transfer-Encoding': 'identity'
		});

		reply.raw.write(`data: ${JSON.stringify({ type: 'log', message: 'Connection with Server established' })}\n\n`);

		connectedClients.set(Number(request.id), reply);

		sendPopupToClient(Number(request.id), 'BEEP BOOP BEEEEEP ~011001~ Server Connection established', '-> it\'s pongin\' time!', 'green', 'testCallback()', 'HELL YEAH BEEP BOOP BACK AT YOU DUDE');

		request.raw.on('close', () => {
			connectedClients.delete(Number(request.id));
			reply.raw.end();
		});

		// Log SSE errors
		reply.raw.on('error', (err) => {
			app.log.error('SSE error:', err);
		});
	});
}

export const sendRawToClient = (userId: number, data: any) => {
	const client = connectedClients.get(userId);
	if (client) {
		client.raw.write(data);
	} else {
		console.error(`Client with userId ${userId} not found.`);
	}
};
export function sendPopupToClient(userId: number, title: string = 'Info', description: string = '', color: string = 'black', callback: string = '', buttonName: string = 'PROCEED') {
	let reply = connectedClients.get(userId);
	if (!reply) {
		logger.error(`Client with userId ${userId} not found.`);
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
	connectedClients.forEach((reply, userId) => {
		sendPopupToClient(userId, 'PING', '-> it\'s pongin\' time!', 'pink');
	});
}, 100000);