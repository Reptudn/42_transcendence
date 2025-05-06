import fp from 'fastify-plugin';
import fastifyCookie from '@fastify/cookie';

export default fp(async (fastify) => {
	fastify.register(fastifyCookie);
});
