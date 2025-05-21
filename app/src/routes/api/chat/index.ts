import { FastifyPluginAsync } from 'fastify';
// import { WebSocket as WSWebSocket } from 'ws';

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	// const players = new Set<WebSocket>();

	fastify.get('/', { websocket: true }, (socket, req) => {
		// players.add(socket);
		socket.send(
			JSON.stringify({ user: 'System', message: 'Connected to chat!' })
		);

		socket.on('message', (message: Buffer) => {
			const msg = message.toString();
			console.info('chat function = ', msg);
			// for (const player of players) {
			// player.send(msg);
			// }
			socket.send(msg);
		});

		socket.on('close', () => {
			console.log('Disconnected from chat!');
		});
	});
};

export default chat;
