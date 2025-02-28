import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import ejs from 'ejs';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';
import logger from './logger.js';
import { registerUser, loginUser, getUserById, updateUserProfile, updateUserPassword, printDatabase } from './db/database.js';

const app = fastify();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
	}
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


/* --------------------------------- */
/* --------------API---------------- */
/* --------------------------------- */

// we should maybe check this out
// https://www.npmjs.com/package/@fastify/auth
// no thats fine i think

// get
app.get('/number', {}, async (req: any, reply: any) => {
	reply.send({ number: theNumber });
});

// post
app.post("/login", async (req: any, reply: any) => {
	printDatabase();
	const { username, password } = req.body;
	try {
		const user = await loginUser(username, password);
		const token = app.jwt.sign({ username: user.username, id: user.id },
			{ expiresIn: '10d' });
		reply.send({ token });
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
app.post("/number", {}, async (req: any, reply: any) => {
	const { number } = req.body;
	theNumber += number;
	reply.send({ number: theNumber });
});
app.post('/profile/edit', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
	const userId = req.user.id;
	try {
		const currentUser = await getUserById(userId);
		if (!currentUser) {
			return reply.code(404).send({ message: 'User not found' });
		}

		const { username, displayName, bio, oldPassword, newPassword } = req.body;

		await updateUserProfile(userId, username, displayName, bio, '');
		await updateUserPassword(userId, oldPassword, newPassword);

		return reply.code(200).send({ message: 'Profile updated' });
	} catch (error) {
		if (error instanceof Error) {
			return reply.code(500).send({ message: error.message });
		} else {
			return reply.code(500).send({ message: 'An unknown error occurred' });
		}
	}
});

// error
app.setNotFoundHandler((request, reply) => {
	return reply.code(404).view('error.ejs', { error_code: '404' }, {
		layout: 'basic.ejs'
	});
});

/* --------------------------------- */
/* --------------STATIC------------- */
/* --------------------------------- */

async function checkAuth(request: any): Promise<boolean> {
	try {
		await request.jwtVerify();
		return true;
	} catch (error) {
		return false;
	}
}

app.get('/partial/pages/:page', async (req: any, reply: any) => {
	const page = req.params.page;
	const loadpartial = req.headers['loadpartial'] === 'true';
	const layoutOption = loadpartial ? false : 'basic.ejs';
	const isAuthenticated = await checkAuth(req);
	let isSelf: boolean = false;

	if (['game', 'profile', 'edit_profile'].includes(page)) {
		try {
			await req.jwtVerify();
			isSelf = true;
		} catch (error) {
			return reply
				.code(401)
				.view('partial/pages/no_access.ejs', { name: 'Freddy', isAuthenticated }, { layout: layoutOption });
		}
	}
	if (page != 'profile' && page != 'edit_profile')
		return reply.view(`partial/pages/${page}.ejs`, { name: 'Freddy', isAuthenticated }, { layout: layoutOption });
	else {
		const userId = Number(req.user.id);
		const user = await getUserById(userId);
		if (!user)
			return reply.code(404).view('error.ejs', { error_code: '404' }, { layout: 'basic.ejs' });
		return reply.view('partial/pages/' + page + '.ejs', { user, isSelf }, { layout: layoutOption });
	}
});

app.get('/profile/edit', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
	const userId = req.user.id;
	const user = await getUserById(userId);
	if (!user) return reply.code(404).view('error.ejs', { error_code: '404' }, { layout: 'basic.ejs' });
	reply.view('partial/pages/edit_profile.ejs', { user });
});
app.get('/profile/:id', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
	const { id } = req.params;
	let isSelf;
	try {
		await req.jwtVerify();
		isSelf = req.user && req.user.id === parseInt(id);
	} catch (err) {
		isSelf = false;
	}
	const user = await getUserById(parseInt(id));
	if (!user)
		return reply.code(404).view('error.ejs', { error_code: '404' }, { layout: 'basic.ejs' });
	return reply.view('partial/pages/profile.ejs', { user, isSelf });
});
app.get('/menu', async (req: any, reply: any) => {
	const isAuthenticated = await checkAuth(req);
	const menuTemplate = isAuthenticated ? 'partial/menu/loggedin.ejs' : 'partial/menu/guest.ejs';
	return reply.view(menuTemplate, { name: 'Freddy' });
});
app.get('/', async (req: any, reply: any) => {
	let isAuthenticated: boolean = false;
	try {
		await req.jwtVerify();
		isAuthenticated = true;
	}
	catch (error) {
		isAuthenticated = false;
	}
	return reply.view('partial/pages/index.ejs', { name: 'Jonas', isAuthenticated }, { layout: 'basic.ejs' });
});


startServer();

export { app };
