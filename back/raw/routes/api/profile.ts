import { FastifyInstance } from "fastify";
import { getUserById, updateUserProfile, updateUserPassword, deleteUser, verifyUserPassword } from "../../db/db_users.js";
import { checkAuth } from "./auth.js";
import { unlockAchievement } from "../../db/db_achievements.js";

export async function profileRoutes(app: FastifyInstance) {
	const DEFAULT_PROFILE_PIC_COUNT = 26;
	const PROFILE_PIC_OFFSET = Math.floor(Math.random() * DEFAULT_PROFILE_PIC_COUNT);
	app.get('/api/profile/:id/picture', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const { id } = req.params;
		const user = await getUserById(parseInt(id));
		if (!user) {
			return reply.code(404).send({ message: 'User not found' });
		}
		if (!user.profile_picture) {
			let defaultPicId = (user.id + PROFILE_PIC_OFFSET) % DEFAULT_PROFILE_PIC_COUNT;
			return reply.redirect(`/static/assets/images/default_profile${defaultPicId}.png`);
		}
		let base64Data = user.profile_picture;
		const dataPrefix = 'data:image/png;base64,';
		if (base64Data.startsWith(dataPrefix)) {
			base64Data = base64Data.replace(dataPrefix, '');
		}
		reply.header('Content-Type', 'image/png').send(Buffer.from(base64Data, 'base64'));
	});

	app.post('/api/profile/edit', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
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

			if (displayName == "Reptudn" || displayName == "Freddy") {
				await unlockAchievement(userId, 'name-change-creator');
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
	app.post('/api/profile/delete', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		try {
			const currentUser = await checkAuth(req);
			if (!currentUser) {
				return reply.code(404).send({ message: 'User not found' });
			}
			const password = req.body.password;
			if (!password) {
				return reply.code(400).send({ message: 'Password is required' });
			}
			if (!await verifyUserPassword(currentUser.id, password)) {
				return reply.code(401).send({ message: 'Incorrect password' });
			}
			await deleteUser(currentUser.id);
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