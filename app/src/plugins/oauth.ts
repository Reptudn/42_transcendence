import fp from 'fastify-plugin';
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2';
import { unlockAchievement } from '../services/database/achievements';
import {
	getGoogleUser,
	registerGoogleUser,
	loginGoogleUser,
} from '../services/database/users';
import { getGoogleProfile } from '../services/google/profile';

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
		callbackUri: 'http://localhost:3000/api/auth/google/callback', // TODO: dont hardcode this
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
				fastify.log.info("Trying to get google profile from google token");
				user = await getGoogleProfile(token.access_token);
			} catch (error) {
				fastify.log.error('Error getting Google Profile', error);
				reply.send(error);
				return;
			}

			let dbUser: User | null = null;
			try {
				fastify.log.info("Trying to get google user from db")
				dbUser = await getGoogleUser(user.id, fastify);
			} catch (error) {
				fastify.log.error('Error getting Google User', error);
				reply.send(error);
				return;
			}
			if (dbUser === null) {
				try {
					fastify.log.info("Trying to register google user into db")
					await registerGoogleUser(user, fastify);
				} catch (error) {
					fastify.log.error('Error Google Register', error);
					reply.send(error);
					return;
				}
			}

			try {
				fastify.log.info("Trying to login google user")
				const loggedGoogleUser = await loginGoogleUser(
					user.id,
					fastify
				);

				const jwt = fastify.jwt.sign(
					{
						username: loggedGoogleUser.username,
						id: loggedGoogleUser.id,
					},
					{ expiresIn: '10d' }
				);
				fastify.log.info("Trying to unlock login achievement");
				await unlockAchievement(loggedGoogleUser.id, 'login', fastify);
				reply.setCookie('token', jwt, {
					// TODO: make cookie secure
					httpOnly: true,
					secure: false,
					sameSite: 'lax',
					path: '/',
				});
				reply.redirect('/partial/pages/profile');
			} catch (error) {
				fastify.log.error('Error trying to login google user', error);
				reply.send(error);
			}
		} catch (error) {
			fastify.log.error('Error Google Login', error);
			reply.send(error);
		}
	});
});
