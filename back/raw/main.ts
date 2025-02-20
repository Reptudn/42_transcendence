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
import { registerUser, loginUser } from './db/database.js';

const app = fastify();

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

// we should maybe check this out
// https://www.npmjs.com/package/@fastify/auth

// get
app.get('/users/:name', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
	const { name } = req.params;
	reply.send(`Profile for user: ${name}`);
});

// post
app.post("/login", async (req: any, reply: any) => {
	const { username, password } = req.body;
	try {
		const user = await loginUser(username, password);
		const token = app.jwt.sign({ username: user.username, id: user.id });
		reply.send( token );
	}
	catch (error) {
		if (error instanceof Error) {
			reply.code(400).send(error.message);
		} else {
			reply.code(400).send('An unknown error occurred');
		}
		return;
	};
});
app.post("/register", async (req: any, reply: any) => {
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

/* --------------------------------- */
/* --------------STATIC------------- */
/* --------------------------------- */

app.get('/partial/:page', async (req: any, reply: any) => {
	const page = req.params.page;
	const loadpartial = req.headers['loadpartial'] === 'true';
	const dataSample = { name: 'Jonas' };
	const layoutOption = loadpartial ? false : 'basic.ejs';

	if (page === 'game') {
		try {
			await req.jwtVerify();
		} catch (error) {
			return reply.code(401).view('pages/no_access.ejs', dataSample, { layout: layoutOption });
		}
	}
	return reply.view(`pages/${page}.ejs`, dataSample, { layout: layoutOption });
});
app.get('/', async (req: any, reply: any) => {
	logger.info('GET /');
	return reply.view('pages/index.ejs', { name: 'Jonas' }, {
		layout: 'basic.ejs'
	});
});

startServer();

export { app };
