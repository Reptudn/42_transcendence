import fp from 'fastify-plugin';
import oauthPlugin from '@fastify/oauth2';

export default fp(
	async (fastify) => {
		fastify.decorate('authenticate', async function (request: any, reply: any) {
			try {
				await request.jwtVerify();
			} catch (err) {
				return reply.code(401).send({
					error: 'Unauthorized',
					message: 'Invalid or expired token',
				});
			}
		});

		fastify.register(oauthPlugin, {
			name: 'googleOAuth2',
			credentials: {
				client: {
					id: fastify.config.GOOGLE_OAUTH_CLIENT_ID,
					secret: fastify.config.GOOGLE_OAUTH_CLIENT_SECRET,
				},
				auth: oauthPlugin.GOOGLE_CONFIGURATION,
			},
			scope: ['profile', 'email'],
			startRedirectPath: '/api/auth/google/',
			callbackUri: `${fastify.config.HOST_URI}api/auth/google/callback`,
			callbackUriParams: {
				access_type: 'offline',
				prompt: 'consent',
			},
		});
	},
	{ name: 'oauth' }
);
