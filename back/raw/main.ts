import fastify, { FastifyReply, FastifyRequest } from 'fastify';
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

/* --------------------------------- */
/* -----------CONNECTIONS----------- */
/* --------------------------------- */

let connectedClients: Map<number, FastifyReply> = new Map();
app.get('/notify', (request: FastifyRequest, reply: FastifyReply) => {
	reply.raw.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
		'Transfer-Encoding': 'identity'
	});

	reply.raw.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

	connectedClients.set(Number(request.id), reply);

	sendPopupToClient(Number(request.id), 'BEEP BOOP BEEEEEP ~011001~ Server Connection established', '-> it\'s pongin\' time!', 'green', 'testCallback()', 'HELL YEAH BEEP BOOP BACK AT YOU DUDE');
	sendPopupToClient(Number(request.id), 'BEEP BOOP BEEEEEP ~011001~ Server Connection established', '-> it\'s pongin\' time!');
	sendPopupToClient(Number(request.id), 'BEEP BOOP BEEEEEP ~011001~ Server Connection established');
	sendPopupToClient(Number(request.id));

	request.raw.on('close', () => {
		connectedClients.delete(Number(request.id));
		reply.raw.end();
	});

	// Log SSE errors
	reply.raw.on('error', (err) => {
		app.log.error('SSE error:', err);
	});
});

const sendRawToClient = (userId: number, data: any) => {
	const client = connectedClients.get(userId);
	if (client) {
		client.raw.write(data);
	} else {
		console.error(`Client with userId ${userId} not found.`);
	}
};
function sendPopupToClient(userId: number, title: string = 'Info', description: string = '', color: string = 'black', callback: string = '', buttonName: string = 'PROCEED') {
	let reply = connectedClients.get(userId);
	if (!reply) {
		logger.error(`Client with userId ${userId} not found.`);
		return;
	}
	try {
		ejs.renderFile(path.join(__dirname, `../../front/layouts/partial/popup.ejs`), { title, description, color, callback, buttonName }, (err, str) => {
			if (err) {
				logger.error("Error rendering view:", err);
				reply.raw.write(`data: ${JSON.stringify({ err })}\n\n`);
			} else {
				reply.raw.write(`data: ${JSON.stringify({ html: str })}\n\n`);
			}
		});
	} catch (err) {
		logger.error("Error rendering view:", err);
		reply.raw.write(`data: ${JSON.stringify({ err })}\n\n`);
	}
}

/* --------------------------------- */
/* --------------API---------------- */
/* --------------------------------- */

// get
app.get('/number', {}, async (req: any, reply: any) => {
	reply.send({ number: theNumber });
});

// post
app.post("/login", async (req: any, reply: any) => {
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

		const { username, displayName, bio, oldPassword, newPassword, profile_picture } = req.body;

		if (profile_picture) {
			if (typeof profile_picture != 'string' || !profile_picture.startsWith('data:image/png;base64,')) {
				return reply.code(400).send({ message: 'Invalid profile picture' });
			}
		}

		await updateUserProfile(userId, username, displayName, bio, profile_picture);
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

	// generic pages without user-specific content
	if (page != 'profile' && page != 'edit_profile') {
		return reply.view(`partial/pages/${page}.ejs`, { name: 'Freddy', isAuthenticated }, { layout: layoutOption });
	}

	if (!isAuthenticated) {
		return reply
			.code(401)
			.view('partial/pages/no_access.ejs', { name: 'Freddy', isAuthenticated }, { layout: layoutOption });
	}

	const userId = Number(req.user.id);
	const user = await getUserById(userId);
	if (!user)
		return reply.code(404).view('error.ejs', { error_code: '404', isAuthenticated }, { layout: layoutOption });
	return reply.view('partial/pages/' + page + '.ejs', { user, 'isSelf': true, isAuthenticated }, { layout: layoutOption });
});

app.get('/profile/edit', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
	const userId = req.user.id;
	const user = await getUserById(userId);
	if (!user) return reply.code(404).view('error.ejs', { error_code: '404' }, { layout: 'basic.ejs' });
	reply.view('partial/pages/edit_profile.ejs', { user });
});
app.get('/profile/:id', async (req: any, reply: any) => {
	const { id } = req.params;
	let isSelf;
	try {
		await req.jwtVerify();
		isSelf = req.user && req.user.id === parseInt(id);
	} catch (err) {
		isSelf = false;
	}
	let user = await getUserById(parseInt(id));
	if (!user)
		return reply.code(404).view('error.ejs', { error_code: '404' }, { layout: 'basic.ejs' });
	user.profile_picture = "/profile/" + id + "/picture";
	return reply.view('partial/pages/profile.ejs', { user, isSelf });
});
app.get('/profile/:id/picture', async (req: any, reply: any) => {
	const { id } = req.params;
	const user = await getUserById(parseInt(id));
	if (!user) {
		return reply.code(404).view('error.ejs', { error_code: '404' }, { layout: 'basic.ejs' });
	}
	if (!user.profile_picture) {
		return reply.redirect('/static/assets/images/default_profile.png');
	}
	let base64Data = user.profile_picture;
	const dataPrefix = 'data:image/png;base64,';
	if (base64Data.startsWith(dataPrefix)) {
		base64Data = base64Data.replace(dataPrefix, '');
	}
	reply.header('Content-Type', 'image/png').send(Buffer.from(base64Data, 'base64'));
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
