import fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import ejs from 'ejs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';
import logger from './logger.js';
import { registerUser, loginUser, getUserById, updateUserProfile, updateUserPassword } from './db/database.js';

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
app.register(fastifyMultipart, {
	limits: { fileSize: 1 * 1024 * 1024 } // e.g. 1 MB limit
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
	const { username, password } = req.body;
	try {
		const user = await loginUser(username, password);
		const token = app.jwt.sign({ username: user.username, id: user.id },
			{ expiresIn: '10d' });
		reply.send({ token });
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
app.post("/number", {}, async (req: any, reply: any) => {
	const { number } = req.body;
	theNumber += number;
	reply.send({ number: theNumber });
});
app.post('/profile/edit', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
	const userId = req.user.id;
	try {
		// Retrieve current user data to manage the old profile picture.
		const currentUser = await getUserById(userId);
		if (!currentUser) {
			return reply.code(404).send({ message: 'User not found' });
		}

		const parts = await req.parts();
		let fields: any = {};

		let newProfilePicturePath = '';
		for await (const part of parts) {
			if (part.file) {
				// Validate file type
				const allowedMimeTypes = ['image/jpeg', 'image/png'];
				if (!allowedMimeTypes.includes(part.mimetype)) {
					return reply.code(400).send({ message: 'Invalid file type. Only JPEG and PNG images are allowed.' });
				}
				// Generate a unique filename (using timestamp and random integer)
				const ext = part.filename.split('.').pop();
				const filename = `./back/db/uploads/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;

				// Write file and await completion
				const writeStream = fs.createWriteStream(filename);
				await new Promise((resolve, reject) => {
					part.file.pipe(writeStream);
					part.file.on('end', resolve);
					part.file.on('error', reject);
				});
				newProfilePicturePath = filename;
			} else {
				fields[part.fieldname] = part.value;
			}
		}

		if (/\s/.test(fields.username)) {
			return reply.code(400).send({ message: 'Username cannot contain spaces' });
		}

		// If a new profile picture was uploaded, delete the old one if it exists and isn’t the default.
		if (newProfilePicturePath) {
			if (currentUser.profile_picture && currentUser.profile_picture !== 'static/assets/images/default_profile.png') {
				fs.unlink(currentUser.profile_picture, (err: any) => {
					if (err) {
						// Log the error without interrupting the update flow.
						console.error(`Failed to delete old profile picture: ${err}`);
					}
				});
			}
		}

		console.log(fields.username);
		console.log(fields.displayname);
		console.log(fields.bio);

		// Update the user profile with either the new picture or retain the old one.
		await updateUserProfile(
			userId,
			fields.username,
			fields.displayname,
			fields.bio,
			newProfilePicturePath || fields.existingProfilePicture || currentUser.profile_picture || ''
		);

		// Handle password update if provided.
		if (fields.oldPassword && fields.newPassword) {
			await updateUserPassword(userId, fields.oldPassword, fields.newPassword);
		}
		reply.send({ message: 'Profile updated successfully' });
	} catch (error: any) {
		reply.code(400).send({ message: error.message });
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
