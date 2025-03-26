import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';
import logger from './logger.js';
import { eventRoutes } from './sse.js';
import { authRoutes, checkAuth } from './routes/api/auth.js';
import { generalRoutes } from './routes/get.js';
import { profileRoutes } from './routes/api/profile.js';
import { numberRoutes } from './routes/api/number.js';
import { friendRoutes } from './routes/api/friends.js';
import { gameRoutes } from './routes/api/games.js';
import oauthPlugin from '@fastify/oauth2';
import fastifyEnv from '@fastify/env';

declare module 'fastify' {
	interface FastifyInstance {
		config: {
			GOOGLE_OAUTH_CLIENT_ID: string;
			GOOGLE_OAUTH_CLIENT_SECRET: string;
		};
	}
}

const app = fastify();

const envSchema = {
	type: 'object',
	required: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
	properties: {
		GOOGLE_OAUTH_CLIENT_ID: { type: 'string' },
		GOOGLE_OAUTH_CLIENT_SECRET: { type: 'string' },
	},
};
app.register(fastifyCookie);
app.register(fastifyEnv, { schema: envSchema }).ready((err) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	// console.log(app.config);
});

app.after(async (err) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}

	app.register(oauthPlugin, {
		name: 'googleOAuth2',
		credentials: {
			client: {
				id: app.config.GOOGLE_OAUTH_CLIENT_ID,
				secret: app.config.GOOGLE_OAUTH_CLIENT_SECRET,
			},
			auth: oauthPlugin.GOOGLE_CONFIGURATION,
		},
		scope: ['profile', 'email'],
		startRedirectPath: '/api/auth/google/',
		callbackUri: 'http://localhost:4242/api/auth/google/callback',
		callbackUriParams: {
			access_type: 'offline',
			prompt: 'consent',
		},
	});
});

export const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.register(fastifyJwt, {
	secret: crypto.randomBytes(64).toString('hex'),
	verify: {
		extractToken: (request: any) => {
			try {
				let token = request.cookies.token;
				// fall back to query param if not found
				if (!token && request.query && request.query.token) {
					token = request.query.token;
				}

				if (!token && request.cookie) token = request.cookie.token;
				return token;
			} catch (error) {
				console.log('Error in jwt extract token', error);
			}
			return undefined;
		},
	},
});
app.register(websocket, {
	options: {
		maxPayload: 1048576, // 1 MB
	},
});
app.register(fastifyView, {
	engine: {
		ejs,
	},
	root: path.join(__dirname, '../../front/layouts'),
	options: {
		context: {
			get: (obj: any, prop: any) => obj && obj[prop],
		},
	},
	viewExt: 'ejs',
});
app.register(fastifyStatic, {
	root: path.join(__dirname, '../../front/static'),
	prefix: '/static/',
	list: true,
});

app.decorate('authenticate', async function (request: any, reply: any) {
	try {
		await request.jwtVerify();
	} catch (err) {
		reply.send(err);
	}
});

app.ready().then(() => {
	console.log(app.printRoutes());
});

async function startServer() {
	app.ready();
	try {
		await app.listen({ port: 4242, host: '0.0.0.0' });
		logger.info(`Server listening on port 4242`);
	} catch (err: any) {
		logger.error(err);
		process.exit(1);
	}
}

app.register(eventRoutes);
app.register(authRoutes);
app.register(generalRoutes);
app.register(profileRoutes);
app.register(numberRoutes);
app.register(friendRoutes);
app.register(gameRoutes);

// error
app.setNotFoundHandler((request, reply) => {
	return reply.code(404).view(
		'/partial/pages/error.ejs',
		{
			err_code: '404',
			err_message:
				'Content not found. Have you considered gaining skill?',
			isAuthenticated: checkAuth(request) != null,
		},
		{
			layout: 'basic.ejs',
		}
	);
});

startServer();
console.log('started server');

export { app };
