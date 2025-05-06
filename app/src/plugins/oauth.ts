import fp from 'fastify-plugin';
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2';

declare module 'fastify' {
	interface FastifyInstance {
		config: {
			GOOGLE_OAUTH_CLIENT_ID: string;
			GOOGLE_OAUTH_CLIENT_SECRET: string;
		};
		googleOAuth2: OAuth2Namespace;
	}
}

export default fp(
	async (fastify) => {
		fastify.decorate(
			'authenticate',
			async function (request: any, reply: any) {
				try {
					await request.jwtVerify();
				} catch (err) {
					reply.send(err);
				}
			}
		);

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
			callbackUri: '/api/auth/google/callback',
			callbackUriParams: {
				access_type: 'offline',
				prompt: 'consent',
			},
		});
	},
	{ name: 'oauth' }
);
