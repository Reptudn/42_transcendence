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
import { numberRoutes } from './routes/number.js';
import { friendRoutes } from './routes/api/friends.js';
import { gameRoutes } from './routes/api/games.js';

const app = fastify();

export const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.register(fastifyJwt, {
	secret: crypto.randomBytes(64).toString('hex'),
	verify: {
		extractToken: (request: any) => {
			let token = request.cookies.token;
			// fall back to query param if not found
			if (!token && request.query && request.query.token) {
				token = request.query.token;
			}
			return token;
		}
	}
});
app.register(websocket, {
	options: {
		maxPayload: 1048576, // 1 MB
	}
});
app.register(fastifyView, {
	engine: {
		ejs
	},
	root: path.join(__dirname, '../../front/layouts'),
	options: {
		context: {
			get: (obj: any, prop: any) => obj && obj[prop]
		}
	},
	viewExt: 'ejs'
});
app.register(fastifyCookie);
app.register(fastifyStatic, {
	root: path.join(__dirname, '../../front/static'),
	prefix: '/static/',
	list: true
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
	return reply.code(404).view('/partial/pages/error.ejs', { err_code: '404', err_message: 'Content not found. Have you considered gaining skill?', isAuthenticated: checkAuth(request) != null }, {
		layout: 'basic.ejs'
	});
});

startServer();

export { app };