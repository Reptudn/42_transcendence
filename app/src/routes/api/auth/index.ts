import { FastifyPluginAsync } from 'fastify';
import { unlockAchievement } from '../../../services/database/achievements';
import { loginUser, registerUser } from '../../../services/database/users';

const authSchema = {
	type: 'object',
	properties: {
		username: {
			type: 'string',
			minLength: process.env.NODE_ENV === 'production' ? 3 : 1,
			maxLength: 16,
			pattern: '^[a-zA-Z0-9_]+$', // Nur alphanumerische Zeichen und Unterstriche
		},
		password: {
			type: 'string',
			minLength: process.env.NODE_ENV === 'production' ? 8 : 1,
			maxLength: 32,
			pattern:
				process.env.NODE_ENV === 'production'
					? '^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&#+-])[A-Za-z\\d@$!%*?&#+-]+$'
					: '',
		},
		displayname: {
			type: 'string',
			minLength: process.env.NODE_ENV === 'production' ? 3 : 1,
			maxLength: 32,
		},
	},
	required: ['username', 'password'], // 'displayname' nur für Registrierung erforderlich
	additionalProperties: false,
};

const registerSchema = {
	...authSchema,
	required: [...authSchema.required, 'displayname'], // 'displayname' verpflichtend
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
				return reply.setCookie('token', token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'strict',
					path: '/',
				}).send({ message: 'Logged in!' });
			} catch (error) {
				if (error instanceof Error)
					return reply.code(400).send({ message: error.message });
				return reply
					.code(400)
					.send({ message: 'An unknown error occurred' });
			}
		}
	);
	fastify.post('/logout', async (req: any, reply: any) => {
		return reply.clearCookie('token', { path: '/' }).send({ message: 'Logged out successfully' });
	});
	fastify.post(
		'/register',
		{ schema: { body: registerSchema } },
		async (req: any, reply: any) => {
			const { username, password, displayname } = req.body;
			try {
				await registerUser(username, password, displayname, fastify);
				return reply.code(200).send({ message: 'User registered' });
			} catch (error) {
				if (error instanceof Error)
					return reply.code(400).send({ message: error.message });
				return reply
					.code(400)
					.send({ message: 'An unknown error occurred' });
			}
		}
	);
};

export default auth;
