import { FastifyPluginAsync } from 'fastify';
import { unlockAchievement } from '../../../services/database/achievements';
import { loginUser, registerUser } from '../../../services/database/users';

const authSchema = {
	type: 'object',
	properties: {
		username: { type: 'string', minLength: 3, maxLength: 20 },
		password: { type: 'string', minLength: 6, maxLength: 100 },
		displayname: { type: 'string', minLength: 3, maxLength: 50 },
	},
	required: ['username', 'password'],
	additionalProperties: false,
};

const auth: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post(
		'/login',
		{ schema: { body: authSchema } },
		async (req: any, reply: any) => {
			const { username, password } = req.body;
			try {
				const user: User = await loginUser(username, password, fastify);
				const token = fastify.jwt.sign(
					{ username: user.username, id: user.id },
					{ expiresIn: '10d' }
				);
				await unlockAchievement(user.id, 'login', fastify);
				reply.setCookie('token', token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'strict',
					path: '/',
				});
			} catch (error) {
				if (error instanceof Error) {
					reply.code(400).send({ message: error.message });
				} else {
					reply
						.code(400)
						.send({ message: 'An unknown error occurred' });
				}
				return;
			}
		}
	);
	fastify.post('/logout', async (req: any, reply: any) => {
		reply.clearCookie('token', { path: '/' });
		reply.send({ message: 'Logged out successfully' });
	});
	fastify.post(
		'/register',
		{ schema: { body: authSchema } },
		async (req: any, reply: any) => {
			const { username, password, displayname } = req.body;
			try {
				await registerUser(username, password, displayname, fastify);
				reply.code(200).send({ message: 'User registered' });
			} catch (error) {
				if (error instanceof Error) {
					reply.code(400).send({ message: error.message });
				} else {
					reply
						.code(400)
						.send({ message: 'An unknown error occurred' });
				}
				return;
			}
		}
	);
};

export default auth;
