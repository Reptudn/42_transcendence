import fp from 'fastify-plugin';
import totp from 'fastify-totp';

declare module 'fastify' {
	interface FastifyInstance {
		totp: typeof totp;
	}
}

export default fp(async (fastify) => {
	fastify.register(totp);
	fastify.decorate('totp', totp);
});
