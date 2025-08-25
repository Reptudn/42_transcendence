import fp from 'fastify-plugin';
import oauthPlugin from '@fastify/oauth2';
import { getUserById } from '../services/database/users';

export default fp(
	async (fastify) => {
		fastify.decorate('authenticate', async function (request: any, reply: any) {
			try {
				const decoded = await request.jwtVerify();
				const user = await getUserById(decoded.id, fastify);
				if (!user) throw new Error('No such user!');
				if (user.username !== decoded.username)
					throw new Error('JWT doesnt match user');
			} catch (err) {
				reply.clearCookie('token', {
					path: '/',
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'strict',
				});

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
