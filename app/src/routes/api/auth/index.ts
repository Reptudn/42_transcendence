import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { unlockAchievement } from '../../../services/database/achievements';
import {
	getUserById,
	loginUser,
	registerUser,
} from '../../../services/database/users';
import { getUser2faSecret, verify2fa } from '../../../services/database/totp';

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
					'Username must be at least 3 characters.',
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
					'Password must be at least 8 characters.',
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
		totp: {
			type: 'string',
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

let users_2fa: number[] = [];

const auth: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post(
		'/login',
		{ schema: { body: authSchema } },
		async (req: FastifyRequest, reply: FastifyReply) => {
			const { username, password /*totp*/ } = req.body as {
				username: string;
				password: string;
			};
			try {
				const user: User = await loginUser(
					username,
					password,
					/*totp*/
					fastify
				);
				if ((await getUser2faSecret(user, fastify)) !== '') {
					users_2fa.push(user.id);
					return reply.send({
						twofa_status: true,
						userid: user.id,
					});
				}
				const token = fastify.jwt.sign(
					{ username: user.username, id: user.id },
					{ expiresIn: '10d' }
				);
				await unlockAchievement(user.id, 'login', fastify);
				return reply
					.setCookie('token', token, {
						httpOnly: true,
						secure: process.env.NODE_ENV === 'production',
						sameSite: 'strict',
						path: '/',
					})
					.send({ message: 'Login successful!' });
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
	fastify.post(
		'/logout',
		async (req: FastifyRequest, reply: FastifyReply) => {
			reply.clearCookie('token', { path: '/' });
			reply.send({ message: 'Logged out successfully' });
		}
	);
	fastify.post(
		'/register',
		{ schema: { body: registerSchema } },
		async (req: FastifyRequest, reply: FastifyReply) => {
			const { username, password, displayname } = req.body as {
				username: string;
				password: string;
				displayname: string;
			};
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
	fastify.post(
		'/2fa',
		{},
		async (req: FastifyRequest, reply: FastifyReply) => {
			const { userid, fa_token } = req.body as {
				userid: number;
				fa_token: string;
			};
			if (!userid || !fa_token)
				return reply.code(401).send({error: 'Invalid 2fa code!'});
			const user = await getUserById(userid, fastify);
			if (!user) return reply.code(401).send({error: 'Invalid 2fa code!'});
			const index = users_2fa.findIndex((id) => id === userid);
			if (index === -1) return reply.code(401).send({error: 'Invalid 2fa code!'});
			if ((await verify2fa(user, fa_token, fastify)) === false){
				return reply.code(401).send({error: 'Invalid 2fa code!'});
			}
			users_2fa = users_2fa.filter((id) => id !== user.id);
			const token = fastify.jwt.sign(
				{ username: user.username, id: user.id },
				{ expiresIn: '10d' }
			);
			await unlockAchievement(user.id, 'login', fastify);
			return reply
				.setCookie('token', token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'strict',
					path: '/',
				})
				.send({ message: 'Login successful with 2fa!' });
		}
	);
};

export default auth;
