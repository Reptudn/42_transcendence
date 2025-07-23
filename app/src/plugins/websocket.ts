import fp from 'fastify-plugin';
import websocket from '@fastify/websocket';

export default fp(async (fastify) => {
	fastify.register(websocket, {
		options: {
			maxPayload: 1048576, // 1 MiB
		},
	});
});
