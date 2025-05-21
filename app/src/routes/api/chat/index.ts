import { FastifyPluginAsync } from 'fastify';
import { WebSocket as WSWebSocket } from 'ws';

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/', { websocket: true }, (socket, req) => {
		socket.on('message', (message: Buffer) => {
			const msg = message.toString();
			socket.send(msg);
		});

		socket.on('close', (event) => {
			socket.send('Disconnected from chat!')
		});

		socket.on('open', (event) => {
			socket.send('Connected to chat!')
		});
	});
};

export default chat;
