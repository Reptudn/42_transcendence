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
			pattern: '^[a-zA-Z0-9_]+$', // Only alphanumeric characters and underscores
			errorMessage: {
				type: 'Username must be a string.',
				minLength:
					'Username must be at least 3 characters in production or 1 in development.',
				maxLength: 'Username can have a maximum of 16 characters.',
				pattern:
					'Username can only contain alphanumeric characters and underscores.',
			},
		},
		password: {
			type: 'string',
			minLength: process.env.NODE_ENV === 'production' ? 8 : 1,
			maxLength: 32,
			pattern:
				process.env.NODE_ENV === 'production'
					? '^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&#+-])[A-Za-z\\d@$!%*?&#+-]+$'
					: '',
			errorMessage: {
				type: 'Password must be a string.',
				minLength:
					'Password must be at least 8 characters in production or 1 in development.',
				maxLength: 'Password can have a maximum of 32 characters.',
				pattern:
					'Password must include at least one uppercase letter, one lowercase letter, one digit, and one special character.',
			},
		},
		displayname: {
			type: 'string',
			minLength: process.env.NODE_ENV === 'production' ? 3 : 1,
			maxLength: 32,
			errorMessage: {
				type: 'Display name must be a string.',
				minLength:
					'Display name must be at least 3 characters in production or 1 in development.',
				maxLength: 'Display name can have a maximum of 32 characters.',
			},
		},
	},
	required: ['username', 'password'],
	additionalProperties: false,
	errorMessage: {
		required: {
			username: 'Username is required.',
			password: 'Password is required.',
		},
		additionalProperties: 'No additional properties are allowed.',
	},
};

const registerSchema = {
	...authSchema,
	required: [...authSchema.required, 'displayname'],
	errorMessage: {
		required: {
			username: 'Username is required.',
			password: 'Password is required.',
			displayname: 'Display name is required for registration.',
		},
		additionalProperties: 'No additional properties are allowed.',
	},
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
		{ schema: { body: registerSchema } },
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
