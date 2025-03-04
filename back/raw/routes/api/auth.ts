import fastify, { FastifyInstance } from "fastify";
import { getUserById, loginUser, registerUser } from "../../db/db_users.js";
import { User } from "../../db/database.js";
import oauthPlugin from '@fastify/oauth2';

export async function authRoutes(app: FastifyInstance) {
	// normal auth
	app.post("/api/login", async (req: any, reply: any) => {
		const { username, password } = req.body;
		try {
			const user: User = await loginUser(username, password);
			const token = app.jwt.sign({ username: user.username, id: user.id },
				{ expiresIn: '10d' });
			reply
				.setCookie('token', token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'none',
					path: '/'
				});
		}
		catch (error) {
			if (error instanceof Error) {
				reply.code(400).send({ message: error.message });
			} else {
				reply.code(400).send({ message: 'An unknown error occurred' });
			}
			return;
		};
	});
	app.post("/api/logout", async (req: any, reply: any) => {
		reply.clearCookie('token', { path: '/' });
		reply.send({ message: "Logged out successfully" });
	});
	app.post("/api/register", async (req: any, reply: any) => {
		const { username, password, displayname } = req.body;
		try {
			await registerUser(username, password, displayname);
			reply.code(200).send({ message: 'User registered' });
		}
		catch (error) {
			if (error instanceof Error) {
				reply.code(400).send({ message: error.message });
			} else {
				reply.code(400).send({ message: 'An unknown error occurred' });
			}
			return;
		}
	});


	if (process.env.googleClientId && process.env.googleClientSecret) {
		console.log('Google OAuth enabled');
		
		// google oauth
		app.register(oauthPlugin, {
			name: 'googleOAuth2',
			scope: ['profile', 'email'],
			config: {
				tokenHost: 'https://accounts.google.com',
				tokenPath: '/o/oauth2/token',
				authorizeHost: 'https://accounts.google.com',
				authorizePath: '/o/oauth2/auth',
			},
			callbackUri: 'http://localhost:3000/auth/google/callback',
			credentials: {
				client: {
					id: "",
					secret: "",
				},
				auth: oauthPlugin.GOOGLE_CONFIGURATION,
			},
			startRedirectPath: 'api/auth/google',
			callbackUriParams: true,
		});
		app.get('/api/auth/google/callback', async (req: any, reply: any) => {
			const { token, user } = req.googleOAuth2;
			if (token && user) {
				const dbUser = await getUserById(user.id);
				if (!dbUser) {
					await registerUser(user.email, '', user.displayName);
				}
				const jwt = app.jwt.sign({ username: user.email, id: user.id },
					{ expiresIn: '10d' });
				reply.setCookie('token', jwt, {
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'none',
				});
				reply.redirect('/');
			} else {
				reply.send('Something went wrong');
			}
		});

	} else console.log('Google OAuth disbaled');
}

export async function checkAuth(request: any, throwErr: boolean = false): Promise<User | null> {
	try {
		await request.jwtVerify();
		return getUserById(request.user.id);
	} catch (error) {
		if (throwErr) {
			throw new Error('Unauthorized');
		}
		return null;
	}
}