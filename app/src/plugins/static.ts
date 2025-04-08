import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';
import path from 'node:path';

export default fp(async (fastify) => {
	fastify.register(fastifyStatic, {
		root: path.join(__dirname, '../static/'),
		prefix: '/static/',
	});
});
