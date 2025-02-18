import fastify from 'fastify';
import fastifyFormbody from '@fastify/formbody';
import fastifyJwt from '@fastify/jwt';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import path from 'path';
import logger from './logger.js';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/libsql';

const app = fastify();

const db = drizzle(process.env.DB_FILE_LOCATION!);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.register(fastifyFormbody);
app.register(fastifyJwt, { secret: '42heilbronn' });
app.register(fastifyView, {
	engine: {
		ejs
	},
	options: {
		context: {
			get: (obj: any, prop: any) => obj && obj[prop]
		}
	}
});
app.register(fastifyStatic, {
	root: path.join(__dirname, '../static'),
	prefix: '/static/'
});

app.decorate('authenticate', async function (request: any, reply: any) {
	try {
		await request.jwtVerify();
	} catch (err) {
		reply.send(err);
	}
});

async function startServer() {
	try {
		await app.listen({ port: 4242 });
		logger.info(`Server listening on port 4242`);
	} catch (err: any) {
		logger.error(err);
		process.exit(1);
	}
}

startServer();

export { app };
