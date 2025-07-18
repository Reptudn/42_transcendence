import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

export default fp(async (fastify) => {
	fastify.register(fastifyJwt, {
		secret: fastify.config.JWT_SECRET || 'supersecret',
		verify: {
			extractToken: (request: any) => {
				try {
					let token = request.cookies.token;
					// fall back to query param if not found
					if (!token && request.query && request.query.token) {
						token = request.query.token;
					}

					if (!token && request.cookie) token = request.cookie.token;
					return token;
				} catch (error) {
					fastify.log.error('Error in jwt extract token', error);
				}
				return undefined;
			},
		},
	});
});
