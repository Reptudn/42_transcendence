import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';
import logger from './logger.js';
import { eventRoutes } from './events/sse.js';
import { authRoutes } from './routes/auth.js';
import { staticRoutes } from './routes/static.js';
import { profileRoutes } from './routes/profile.js';

const app = fastify();

export const __dirname = path.dirname(fileURLToPath(import.meta.url));

let theNumber: number = 0;

app.register(fastifyJwt, { secret: crypto.randomBytes(64).toString('hex') });
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

app.get('/number', {}, async (req: any, reply: any) => {
	reply.send({ number: theNumber });
});

app.register(eventRoutes);
app.register(authRoutes);
app.register(staticRoutes);
app.register(profileRoutes);

// post
app.post("/number", {}, async (req: any, reply: any) => {
	const { number } = req.body;
	theNumber += number;
	reply.send({ number: theNumber });
});

// error
app.setNotFoundHandler((request, reply) => {
	return reply.code(404).view('error.ejs', { error_code: '404' }, {
		layout: 'basic.ejs'
	});
});

startServer();

export { app };