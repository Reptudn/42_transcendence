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
	root: path.join(__dirname, '../../front/layouts'),
	options: {
		context: {
			get: (obj: any, prop: any) => obj && obj[prop]
		}
	}
});
app.register(fastifyStatic, {
	root: path.join(__dirname, '../..//front/static'),
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


/* --------------------------------- */
/* --------------API---------------- */
/* --------------------------------- */

// get
app.get('/users/:name', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
	const { name } = req.params;
	reply.send(`Profile for user: ${name}`);
});

// post
app.post("/login", async (req: any, reply: any) => {
	const { username, password } = req.body;
	// check with db
});
app.post("/register", async (req: any, reply: any) => {
	const { username, password, email } = req.body;
	// check with db
})

// error
app.setNotFoundHandler((request, reply) => {
    return reply.code(404).view('error.ejs', { error_code: '404' }, {
		layout: 'basic.ejs'
	});
});

/* --------------------------------- */
/* --------------STATIC------------- */
/* --------------------------------- */

app.get('/partial/:page', async (req: any, reply: any) => {
	const page = req.params.page;
	const dataSample = { name: 'Jonas' };
	return reply.view(`pages/${page}.ejs`, dataSample);
});
app.get('/', async (req: any, reply: any) => {
	logger.info('GET /');
	return reply.view('pages/index.ejs', { name: 'Jonas' }, {
		layout: 'basic.ejs'
	});
});

startServer();

export { app };
