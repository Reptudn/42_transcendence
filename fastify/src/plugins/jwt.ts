import fp from 'fastify-plugin';
import crypto from 'crypto';
import fastifyJwt from '@fastify/jwt';

export default fp(async (fastify, opts) => {
	fastify.register(fastifyJwt, {
		secret: crypto.randomBytes(64).toString('hex'),
		verify: {
			extractToken: (request: any) => {
				let token = request.cookies.token;
				// fall back to query param if not found
				if (!token && request.query && request.query.token) {
					token = request.query.token;
				}
				return token;
			}
		}
	});
});
