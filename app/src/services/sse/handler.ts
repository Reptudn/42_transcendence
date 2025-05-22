import { FastifyReply } from 'fastify';

// user id ; reply to send raw messages
export let connectedClients: Map<number, FastifyReply> = new Map();

export function sendSseHeaders(reply: FastifyReply) {
  reply.raw.writeHead(200, {
	'Content-Type': 'text/event-stream',
	'Cache-Control': 'no-cache',
	'Connection': 'keep-alive',
  });
  reply.raw.flushHeaders();
}

// sends a message to the client
export function sendSseMessage(
  reply: FastifyReply,
  msgType: 'log' | 'popup' | 'friendRequest' | 'achievement' | 'error',
  rawMessage: any,
) {
	reply.raw.write(
		`data: ${JSON.stringify({
			type: msgType,
			message: rawMessage,
		})}\n\n`
	);
}

// sends raw html to the client
export function sendSseHtml(
	reply: FastifyReply,
	msgType: 'log' | 'popup' | 'friendRequest' | 'achievement' | 'error',
	html: string,
) {
	reply.raw.write(
		`data: ${JSON.stringify({
			type: msgType,
			html: html,
		})}\n\n`
	);
}