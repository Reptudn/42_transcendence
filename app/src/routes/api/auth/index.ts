import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { unlockAchievement } from '../../../services/database/achievements';
import {
	//getGoogleUser,
	getUserById,
	//loginGoogleUser,
	loginUser,
	registerUser,
} from '../../../services/database/users';
import {
	getUser2faRescue,
	getUser2faSecret,
	removeUser2fa,
	verify2fa,
} from '../../../services/database/totp';
import { checkAuth } from '../../../services/auth/auth';

const authSchema = {
	type: 'object',
	properties: {
		username: {
			type: 'string',
			minLength: process.env.NODE_ENV === 'production' ? 3 : 1,
			maxLength: 16,
			pattern: '^[a-zA-Z0-9_]+$',
			errorMessage: {
				type: 'Username must be a text value',
				minLength:
					process.env.NODE_ENV === 'production'
						? 'Username must be at least 3 characters long'
						: 'Username must be at least 1 character long',
				maxLength: 'Username cannot be longer than 16 characters',
				pattern:
					'Username can only contain letters, numbers, and underscores',
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
				type: 'Password must be a text value',
				minLength:
					process.env.NODE_ENV === 'production'
						? 'Password must be at least 8 characters long'
						: 'Password must be at least 1 character long',
				maxLength: 'Password cannot be longer than 32 characters',
				pattern:
					process.env.NODE_ENV === 'production'
						? 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#+-)'
						: 'Invalid password format',
			},
		},
		displayname: {
			type: 'string',
			minLength: process.env.NODE_ENV === 'production' ? 3 : 1,
			maxLength: 32,
			pattern: '^[a-zA-Z0-9_]+$',
			errorMessage: {
				type: 'Display name must be a text value',
				minLength:
					process.env.NODE_ENV === 'production'
						? 'Display name must be at least 3 characters long'
						: 'Display name must be at least 1 character long',
				maxLength: 'Display name cannot be longer than 32 characters',
			},
		},
		// totp: {
		// 	type: 'string',
		// 	pattern: '^[0-9]{6}$',
		// 	errorMessage: {
		// 		type: 'TOTP code must be a text value',
		// 		pattern: 'TOTP code must be exactly 6 digits'
		// 	}
		// },
	},
	required: ['username', 'password'],
	additionalProperties: false,
	errorMessage: {
		required: {
			username: 'Username is required',
			password: 'Password is required',
		},
		additionalProperties:
			'Unknown field provided. Only username, password, displayname, and totp are allowed',
	},
};

const registerSchema = {
	...authSchema,
	required: [...authSchema.required, 'displayname'],
	errorMessage: {
		required: {
			username: 'Username is required for registration',
			password: 'Password is required for registration',
			displayname: 'Display name is required for registration',
		},
		additionalProperties:
			'Unknown field provided. Only username, password, displayname, and totp are allowed',
	},
};

let users_2fa: number[] = [];
export let users_2fa_google: number[] = [];

const auth: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get(
		'/check',
		{ preValidation: fastify.authenticate },
		async (req: FastifyRequest, reply: FastifyReply) => {
			const user = checkAuth(req, false, fastify);
			if (!user) {
				reply.clearCookie('token', {
					path: '/',
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'strict',
				});
				return reply.code(401).send({ error: 'Unauthorized' });
			}
			return reply.code(200).send({ message: 'Ok' });
		}
	);

	fastify.post(
		'/login',
		{ schema: { body: authSchema } },
		async (req: FastifyRequest, reply: FastifyReply) => {
			const { username, password } = req.body as {
				username: string;
				password: string;
			};
			try {
				const user: User = await loginUser(username, password, fastify);
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
				if (error instanceof Error)
					return reply.code(400).send({ message: error.message });
				return reply
					.code(400)
					.send({ message: 'An unknown error occurred' });
			}
		}
	);

	fastify.post('/logout', async (req: any, reply: any) => {
		return reply
			.code(200)
			.clearCookie('token', { path: '/' })
			.send({ message: 'Logged out successfully' });
	});

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

	fastify.post('/2fa', async (req: FastifyRequest, reply: FastifyReply) => {
		const { userid, fa_token, rescue_token } = req.body as {
			userid: number;
			fa_token: string;
			rescue_token: string;
		};

		const user = await getUserById(userid, fastify);
		if (!user) return reply.code(401).send({ error: 'Invalid 2fa code!' });
		if (rescue_token !== (await getUser2faRescue(user, fastify))) {
			if (!userid || !fa_token)
				return reply.code(401).send({ error: 'Invalid 2fa code!' });
			const index = users_2fa.findIndex((id) => id === Number(userid));
			if (index === -1)
				return reply.code(401).send({ error: 'Invalid 2fa code!' });
			if ((await verify2fa(user, fa_token, fastify)) === false) {
				return reply.code(401).send({ error: 'Invalid 2fa code!' });
			}
		}
		users_2fa = users_2fa.filter((id) => id !== user.id);
		if (rescue_token === (await getUser2faRescue(user, fastify))) {
			await removeUser2fa(user, fastify);
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
			.send({ message: 'Login successful with 2fa!' });
	});
	fastify.post(
		'/2fa_google',
		{
			schema: {
				body: {
					type: 'object',
					properties: {
						rescue_token: {
							type: 'string',
							minLength: 0,
							maxLength: 22,
							errorMessage: {
								type: 'Wrong rescue code',
								minLength: 'Wrong rescue code',
								maxLength: 'Wrong rescue code',
							},
						},
						fa_token: {
							type: 'string',
							minLength: 0,
							maxLength: 6,
							errorMessage: {
								type: 'Wrong 2fa code',
								minLength: 'Wrong 2fa code',
								maxLength: 'Wrong 2fa code',
							},
						},
					},
				},
			},
		},
		async (req: FastifyRequest, reply: FastifyReply) => {
			const { userid, fa_token, rescue_token } = req.body as {
				userid: number;
				fa_token: string;
				rescue_token: string;
			};
			fastify.log.info(`Trying Google 2FA for userid: ${userid}`);
			const user = await getUserById(userid, fastify);
			if (!user) return reply.code(401).send({ error: 'Invalid 2fa code! 1' });
			if (rescue_token !== (await getUser2faRescue(user, fastify))) {
				if (!userid || !fa_token)
					return reply.code(401).send({ error: 'Invalid 2fa code! 2' });
				const index = users_2fa_google.findIndex(
					(id) => id === Number(userid)
				);
				if (index === -1)
					return reply
						.code(401)
						.send({ error: 'Invalid 2fa code pls work!' });
				if ((await verify2fa(user, fa_token, fastify)) === false) {
					return reply.code(401).send({ error: 'Invalid 2fa code! 4' });
				}
			}
			users_2fa_google = users_2fa_google.filter((id) => id !== user.id);
			if (rescue_token === (await getUser2faRescue(user, fastify))) {
				await removeUser2fa(user, fastify);
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
				.send({ message: 'Login successful with 2fa!' });
		}
	);
};

export default auth;
