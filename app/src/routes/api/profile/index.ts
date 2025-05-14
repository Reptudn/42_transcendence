import { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../../../services/auth/auth';
import { unlockAchievement } from '../../../services/database/achievements';
import {
	getUserById,
	updateUserProfile,
	updateUserPassword,
	updateUserTitle,
	verifyUserPassword,
	deleteUser,
} from '../../../services/database/users';

const profile: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	const DEFAULT_PROFILE_PIC_COUNT = 34;
	const PROFILE_PIC_OFFSET = Math.floor(
		Math.random() * DEFAULT_PROFILE_PIC_COUNT
	);
	fastify.get(
		'/:id/picture',
		{ preValidation: [fastify.authenticate] },
		async (req: any, reply: any) => {
			const { id } = req.params;
			const user = await getUserById(parseInt(id), fastify);
			if (!user) {
				return reply.code(404).send({ message: 'User not found' });
			}
			if (!user.profile_picture) {
				let defaultPicId =
					(user.id + PROFILE_PIC_OFFSET) % DEFAULT_PROFILE_PIC_COUNT;
				return reply.redirect(
					`/static/assets/images/default_profile${defaultPicId}.png`
				);
			}
			let base64Data = user.profile_picture;
			const dataPrefix = 'data:image/png;base64,';
			if (base64Data.startsWith(dataPrefix)) {
				base64Data = base64Data.replace(dataPrefix, '');
			}
			reply
				.header('Content-Type', 'image/png')
				.send(Buffer.from(base64Data, 'base64'));
		}
	);

	fastify.post(
		'/edit',
		{ preValidation: [fastify.authenticate] },
		async (req: any, reply: any) => {
			const userId = req.user.id;
			try {
				const currentUser = await getUserById(userId, fastify);
				if (!currentUser) {
					return reply.code(404).send({ message: 'User not found' });
				}

				const {
					username,
					displayName,
					bio,
					oldPassword,
					newPassword,
					profile_picture,
				} = req.body;

				if (profile_picture) {
					if (
						typeof profile_picture != 'string' ||
						!profile_picture.startsWith('data:image/png;base64,')
					) {
						return reply
							.code(400)
							.send({ message: 'Invalid profile picture' });
					}
				}

				if (
					displayName == 'Reptudn' ||
					displayName == 'Freddy' ||
					displayName == 'Lauch' ||
					displayName == 'Nick' ||
					displayName == 'Luca'
				) {
					await unlockAchievement(
						userId,
						'name-change-creator',
						fastify
					);
				}
				if (typeof bio == 'string')
					if (bio.length > 100)
						await unlockAchievement(userId, 'long-bio', fastify);
				if (profile_picture) {
					await unlockAchievement(userId, 'pfp-change', fastify);
				}

				await updateUserProfile(
					userId,
					username,
					displayName,
					bio,
					profile_picture,
					fastify
				);
				await updateUserPassword(
					userId,
					oldPassword,
					newPassword,
					fastify
				);

				return reply.code(200).send({ message: 'Profile updated' });
			} catch (error) {
				if (error instanceof Error) {
					return reply.code(500).send({ message: error.message });
				} else {
					return reply
						.code(500)
						.send({ message: 'An unknown error occurred' });
				}
			}
		}
	);
	fastify.post(
		'/edit-title',
		{ preValidation: [fastify.authenticate] },
		async (req: any, reply: any) => {
			const userId = req.user.id;
			try {
				const currentUser = await getUserById(userId, fastify);
				if (!currentUser) {
					return reply.code(404).send({ message: 'User not found' });
				}

				const { firstTitle, secondTitle, thirdTitle } = req.body;

				await updateUserTitle(
					userId,
					firstTitle,
					secondTitle,
					thirdTitle,
					fastify
				);

				return reply.code(200).send({ message: 'Profile updated' });
			} catch (error) {
				if (error instanceof Error) {
					return reply.code(500).send({ message: error.message });
				} else {
					return reply.code(500).send({
						message: 'An unknown error occurred',
					});
				}
			}
		}
	);
	fastify.post(
		'/delete',
		{ preValidation: [fastify.authenticate] },
		async (req: any, reply: any) => {
			try {
				const currentUser = await checkAuth(req, false, fastify);
				if (!currentUser) {
					return reply.code(404).send({ message: 'User not found' });
				}
				const password = req.body.password;
				if (!password) {
					return reply
						.code(400)
						.send({ message: 'Password is required' });
				}
				if (
					!(await verifyUserPassword(
						currentUser.id,
						password,
						fastify
					))
				) {
					return reply
						.code(401)
						.send({ message: 'Incorrect password' });
				}
				await deleteUser(currentUser.id, fastify);
				return reply.code(200).send({ message: 'Profile deleted' });
			} catch (error) {
				if (error instanceof Error) {
					return reply.code(500).send({ message: error.message });
				} else {
					return reply
						.code(500)
						.send({ message: 'An unknown error occurred' });
				}
			}
		}
	);
};

export default profile;
