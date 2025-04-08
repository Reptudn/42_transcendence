import fp from 'fastify-plugin';
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2';
import { getGoogleProfile } from '../services/google/profile';
import { unlockAchievement } from '../services/database/db_achievements';
import {
	getGoogleUser,
	registerGoogleUser,
	loginGoogleUser,
} from '../services/database/db_users';

declare module 'fastify' {
	interface FastifyInstance {
		config: {
			GOOGLE_OAUTH_CLIENT_ID: string;
			GOOGLE_OAUTH_CLIENT_SECRET: string;
		};
		googleOAuth2: OAuth2Namespace;
	}
}

export default fp(async (fastify) => {
	fastify.decorate('authenticate', async function (request: any, reply: any) {
		try {
			await request.jwtVerify();
		} catch (err) {
			reply.send(err);
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
		callbackUri: 'http://localhost:4242/api/auth/google/callback', // TODO: dont hardcode this
		callbackUriParams: {
			access_type: 'offline',
			prompt: 'consent',
		},
	});

	fastify.get('/api/auth/google/callback', async (req: any, reply: any) => {
		try {
			const { token } =
				await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
					req
				);
			let user: GoogleUserInfo;
			try {
				user = await getGoogleProfile(token.access_token);
			} catch (error) {
				reply.send('Something went wrong');
				return;
			}

			const dbUser = await getGoogleUser(user.id);
			if (dbUser === null) {
				try {
					await registerGoogleUser(user);
				} catch (error) {
					fastify.log.error('Error Google Register', error);
					reply.send(error);
					return;
				}
			}

			try {
				const loggedGoogleUser = await loginGoogleUser(user.id);

				const jwt = fastify.jwt.sign(
					{
						username: loggedGoogleUser.username,
						id: loggedGoogleUser.id,
					},
					{ expiresIn: '10d' }
				);
				await unlockAchievement(loggedGoogleUser.id, 'login');
				reply.setCookie('token', jwt, {
					// TODO: make cookie secure
					httpOnly: true,
					secure: false,
					sameSite: 'lax',
					path: '/',
				});
				reply.redirect('/partial/pages/profile');
			} catch (error) {
				fastify.log.error('Error Google Login', error);
				reply.send(error);
			}
		} catch (error) {
			fastify.log.error('Error Google Login', error);
			reply.send(error);
		}
	});
});
