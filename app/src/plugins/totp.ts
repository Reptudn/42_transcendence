import fp from 'fastify-plugin';
import totp from 'fastify-totp';

export default fp(async (fastify) => {
	fastify.register(totp);
});
