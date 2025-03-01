import { FastifyInstance } from "fastify";
import { getUserById, updateUserProfile, updateUserPassword, deleteUser, verifyUserPassword } from "../db/db_users.js";

export async function profileRoutes(app: FastifyInstance) {
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

	app.get('/profile/edit', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const userId = req.user.id;
		const user = await getUserById(userId);
		if (!user) return reply.code(404).view('error.ejs', { error_code: '404' }, { layout: 'basic.ejs' });
		reply.view('partial/pages/edit_profile.ejs', { user });
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
	app.post('/profile/delete', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const userId = req.user.id;
		try {
			const currentUser = await getUserById(userId);
			if (!currentUser) {
				return reply.code(404).send({ message: 'User not found' });
			}
			const password = req.body.password;
			if (!password) {
				return reply.code(400).send({ message: 'Password is required' });
			}
			if (!await verifyUserPassword(userId, password)) {
				return reply.code(401).send({ message: 'Incorrect password' });
			}
			await deleteUser(userId);
			return reply.code(200).send({ message: 'Profile deleted' });
		} catch (error) {
			if (error instanceof Error) {
				return reply.code(500).send({ message: error.message });
			} else {
				return reply.code(500).send({ message: 'An unknown error occurred' });
			}
		}
	});
}