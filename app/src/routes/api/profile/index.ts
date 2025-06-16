import { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../../../services/auth/auth';
import { unlockAchievement } from '../../../services/database/achievements';
import {
	getUserByUsername,
	updateUserProfile,
	updateUserPassword,
	updateUserTitle,
	verifyUserPassword,
	deleteUser,
} from '../../../services/database/users';

const editProfileSchema = {
	type: 'object',
	properties: {
		username: {
			type: 'string',
			minLength: process.env.NODE_ENV === 'production' ? 3 : 1,
			maxLength: 16,
		},
		displayName: {
			type: 'string',
			minLength: process.env.NODE_ENV === 'production' ? 3 : 1,
			maxLength: 32,
		},
		bio: {
			type: 'string',
			maxLength: 100,
		},
		oldPassword: {
			type: 'string',
			minLength: 8,
			maxLength: 32,
			pattern:
				process.env.NODE_ENV === 'production'
					? '^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&#+-])[A-Za-z\\d@$!%*?&#+-]+$'
					: '',
		},
		newPassword: {
			type: 'string',
			minLength: 8,
			maxLength: 32,
			pattern:
				process.env.NODE_ENV === 'production'
					? '^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&#+-])[A-Za-z\\d@$!%*?&#+-]+$'
					: '',
		},
		profile_picture: {
			type: 'string',
			pattern: '^data:image/png;base64,[A-Za-z0-9+/=]+$',
			maxLength: 1000000, // Adjust as needed for your use case
		},
	},
	required: ['username', 'displayName'],
	additionalProperties: false,
};

// TODO: only allow titles that actually exist?
const editTitleSchema = {
	type: 'object',
	properties: {
		firstTitle: { type: 'string', maxLength: 50 },
		secondTitle: { type: 'string', maxLength: 50 },
		thirdTitle: { type: 'string', maxLength: 50 },
	},
	required: ['firstTitle', 'secondTitle', 'thirdTitle'],
	additionalProperties: false,
};

const profile: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	const DEFAULT_PROFILE_PIC_COUNT = 34;
	const PROFILE_PIC_OFFSET = Math.floor(
		Math.random() * DEFAULT_PROFILE_PIC_COUNT
	);

	fastify.get('/:username', {
		preValidation: [fastify.authenticate],
		schema: {
			params: {
				type: 'object',
				properties: { username: { type: 'string' } },
				required: ['username'],
			},
		},
	}, async (req: any, reply: any) => {
		let variables: { [key: string]: any } = {};
		const { username } = req.params;
		const user = await getUserByUsername(username, fastify);
		if (!user) {
			return reply.code(404).send({ message: 'User not found' });
		}

		let self_id: number | null = user ? user.id : null;
		let friend_id: number | null = req.params.profile_id
			? parseInt(req.params.profile_id)
			: null;
		if (friend_id == null && self_id == null) {
			errorCode = 400;
			throw new Error('No user id provided & not logged in');
		}
		let isSelf = profileId === req.user.id;
		let profile = await getUserById(profileId, fastify);
		if (!profile) {
			errorCode = 404;
			throw new Error('User not found');
		}
		profile.profile_picture =
			'/profile/' + user.username + '/picture';
		variables['user'] = profile;
		variables['isSelf'] = isSelf;
		variables['title'] = await getUserTitleString(
			profile.id,
			fastify
		);

		const unlockedAchievements = await getUserAchievements(
			profileId,
			fastify
		);
		const allAchievements = await getAllAchievements(fastify);
		const achievements = allAchievements.map((ach) => ({
			...ach,
			unlocked: unlockedAchievements.some(
				(ua) => ua.id === ach.id
			),
		}));
		variables['achievements'] = achievements;
		variables['unlockedCount'] = unlockedAchievements.length;
		variables['totalCount'] = allAchievements.length;

		let friends = await getFriends(profileId, fastify);
		variables['friends'] = friends;

		return reply.view('profile', variables);
	});

	fastify.get(
		'/:username/picture',
		{
			preValidation: [fastify.authenticate],
			schema: {
				params: {
					type: 'object',
					properties: { username: { type: 'string' } },
					required: ['username'],
				},
			},
		},
		async (req: any, reply: any) => {
			const { username } = req.params;
			const user = await getUserByUsername(username, fastify);
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
		{
			preValidation: [fastify.authenticate],
			schema: { body: editProfileSchema },
		},
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
		{
			preValidation: [fastify.authenticate],
			schema: { body: editTitleSchema },
		},
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
		{
			preValidation: [fastify.authenticate],
			schema: {
				body: {
					type: 'object',
					properties: {
						password: {
							type: 'string',
							minLength: 6,
							maxLength: 100,
						},
					},
					required: ['password'],
				},
			},
		},
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
