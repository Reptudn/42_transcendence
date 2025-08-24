import { FastifyReply } from 'fastify';

// user id ; reply to send raw messages
export let connectedClients: Map<number, FastifyReply> = new Map();

export function sendSseHeaders(reply: FastifyReply) {
	try {
		reply.raw.writeHead(200, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		});
		reply.raw.flushHeaders();
	} catch (error) {
		console.error('Error sending SSE headers:', error);
	}
}

// sends a message to the client
export function sendSseMessage(
	reply: FastifyReply,
	msgType: string,
	rawMessage: any
) {
	try {
		reply.raw.write(
			`data: ${JSON.stringify({
				type: msgType,
				message: rawMessage,
			})}\n\n`
		);
	} catch (error) {
		console.error('Error sending SSE message:', error);
	}
}

export function sendSeeMessageByUserId(
	userId: number,
	msgType: string,
	rawMessage: any
) {
	const reply = connectedClients.get(userId);
	if (!reply) throw new Error(`User ${userId} not found in connected users.`);

	try {
		reply.raw.write(
			`data: ${JSON.stringify({
				type: msgType,
				message: rawMessage,
			})}\n\n`
		);
	} catch (error) {
		console.error('Error sending SSE message:', error);
	}
}

// sends raw html to the client
export function sendSseHtml(reply: FastifyReply, msgType: string, html: string) {
	try {
		reply.raw.write(
			`data: ${JSON.stringify({
				type: msgType,
				html: html,
			})}\n\n`
		);
	} catch (error) {
		console.error('Error sending SSE HTML:', error);
	}
}

export function sendSseHtmlByUserId(userId: number, msgType: string, html: string) {
	const reply = connectedClients.get(userId);
	if (!reply) throw new Error(`User ${userId} not found in connected users.`);

	try {
		reply.raw.write(
			`data: ${JSON.stringify({
				type: msgType,
				html: html,
			})}\n\n`
		);
	} catch (error) {
		console.error('Error sending SSE HTML:', error);
	}
}

export function sendSseRaw(reply: FastifyReply, data: string) {
	if (!data.endsWith('\n\n')) data += '\n\n';
	try {
		reply.raw.write(data);
	} catch (error) {
		console.error('Error sending SSE raw data:', error);
	}
}

export function sendSseRawByUserId(userId: number, data: string) {
	const reply = connectedClients.get(userId);
	if (!reply) throw new Error(`User ${userId} not found in connected users.`);
	if (!data.endsWith('\n\n')) data += '\n\n';
	try {
		reply.raw.write(data);
	} catch (error) {
		console.error('Error sending SSE raw data:', error);
	}
}

export function forceCloseSseByUserId(userId: number) {
	const reply = connectedClients.get(userId);
	if (!reply) throw new Error(`User ${userId} not found in connected users.`);

	try {
		reply.raw.end();
		connectedClients.delete(userId);
	} catch (error) {
		console.error('Error closing SSE connection:', error);
	}
}
