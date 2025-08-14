import { FastifyPluginAsync } from 'fastify';
import { unlockAchievement } from '../../../../services/database/achievements';
import {
	getGoogleUser,
	registerGoogleUser,
	loginGoogleUser,
} from '../../../../services/database/users';
import { getGoogleProfile } from '../../../../services/google/user';
import { users_2fa_google } from '../index';
import { getUser2faSecret } from '../../../../services/database/totp';

const google_callback: FastifyPluginAsync = async (
	fastify,
	opts
): Promise<void> => {
	fastify.get('/callback', async (req: any, reply: any) => {
		try {
			const { token } =
				await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
					req
				);
			let user: GoogleUserInfo;
			try {
				fastify.log.info(
					'Trying to get google profile from google token'
				);
				user = await getGoogleProfile(token.access_token);
			} catch (error) {
				fastify.log.error('Error getting Google Profile', error);
				return reply.code(400).send(error);
			}

			let dbUser: User | null = null;
			try {
				fastify.log.info('Trying to get google user from db');
				dbUser = await getGoogleUser(user.id, fastify);
			} catch (error) {
				fastify.log.error('Error getting Google User', error);
				return reply.code(400).send(error);
			}
			if (dbUser === null) {
				try {
					fastify.log.info('Trying to register google user into db');
					await registerGoogleUser(user, fastify);
				} catch (error) {
					fastify.log.error('Error Google Register', error);
					return reply.code(400).send(error);
				}
			}

			try {
				fastify.log.info('Trying to login google user');
				const loggedGoogleUser = await loginGoogleUser(
					user.id,
					fastify
				);

				const twofaSecret = await getUser2faSecret(loggedGoogleUser, fastify);
                if (twofaSecret !== '') {
					users_2fa_google.push(loggedGoogleUser.id);
                    return reply.redirect(`/partial/pages/2fa_code?google=1&userid=${loggedGoogleUser.id}`);
                }

				const jwt = fastify.jwt.sign(
					{
						username: loggedGoogleUser.username,
						id: loggedGoogleUser.id,
					},
					{ expiresIn: '10d' }
				);
				fastify.log.info('Trying to unlock login achievement');
				await unlockAchievement(loggedGoogleUser.id, 'login', fastify);
				reply.setCookie('token', jwt, {
					httpOnly: process.env.NODE_ENV === 'production',
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'lax',
					path: '/',
				});
				return reply.redirect('/partial/pages/profile');
			} catch (error) {
				fastify.log.error('Error trying to login google user', error);
				return reply.code(400).send(error);
			}
		} catch (error) {
			fastify.log.error('Error Google Login', error);
			return reply.code(400).send(error);
		}
	});
};

export default google_callback;
