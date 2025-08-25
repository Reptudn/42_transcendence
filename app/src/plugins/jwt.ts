import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

export default fp(async (fastify) => {
	fastify.register(fastifyJwt, {
		secret: fastify.config.JWT_SECRET || 'supersecret',
		cookie: {
			cookieName: 'token',
			signed: false,
		},
		verify: {
			extractToken: (request: any) => {
				try {
					let token = request.cookies?.token;
					// fall back to query param if not found
					if (!token && request.query && request.query.token) {
						token = request.query.token;
					}

					// Additional fallback for cookie property (different cookie parser)
					if (!token && request.cookie?.token) {
						token = request.cookie.token;
					}

					return token || null;
				} catch (error) {
					fastify.log.error('Error in jwt extract token', error);
					return null;
				}
			},
		},
	});
});
