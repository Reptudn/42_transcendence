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
import { sendSseHtmlByUserId } from '../../../services/sse/handler';
import { getFriends } from '../../../services/database/friends';

function containsLetter(str: string): boolean {
	return /[a-zA-Z]/.test(str);
}

const editProfileSchema = {
	type: 'object',
	properties: {
		username: {
			type: 'string',
			minLength: process.env.NODE_ENV === 'production' ? 3 : 1,
			maxLength: 16,
			pattern: '^[a-zA-Z0-9_]+$',
			errorMessage: {
				type: 'Username must be a text value',
				minLength:
					process.env.NODE_ENV === 'production'
						? 'Username must be at least 3 characters long'
						: 'Username must be at least 1 character long',
				maxLength: 'Username cannot be longer than 16 characters',
				pattern:
					'Username can only contain letters, numbers, and underscores',
			},
		},
		displayName: {
			type: 'string',
			minLength: process.env.NODE_ENV === 'production' ? 3 : 1,
			maxLength: 32,
			pattern: '^[a-zA-Z0-9_]+$',
			errorMessage: {
				type: 'Display name must be a text value',
				minLength:
					process.env.NODE_ENV === 'production'
						? 'Display name must be at least 3 characters long'
						: 'Display name must be at least 1 character long',
				maxLength: 'Display name cannot be longer than 32 characters',
				pattern:
					'Username can only contain letters, numbers, and underscores',
			},
		},
		bio: {
			type: 'string',
			maxLength: 100,
			errorMessage: {
				type: 'Bio must be a text value',
				maxLength: 'Bio cannot be longer than 100 characters',
			},
		},
		oldPassword: {
			type: 'string',
			minLength: 8,
			maxLength: 32,
			pattern:
				process.env.NODE_ENV === 'production'
					? '^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&#+-])[A-Za-z\\d@$!%*?&#+-]+$'
					: '',
			errorMessage: {
				type: 'Current password must be a text value',
				minLength: 'Current password must be at least 8 characters long',
				maxLength: 'Current password cannot be longer than 32 characters',
				pattern:
					process.env.NODE_ENV === 'production'
						? 'Current password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#+-)'
						: 'Invalid password format',
			},
		},
		newPassword: {
			type: 'string',
			minLength: 8,
			maxLength: 32,
			pattern:
				process.env.NODE_ENV === 'production'
					? '^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@$!%*?&#+-])[A-Za-z\\d@$!%*?&#+-]+$'
					: '',
			errorMessage: {
				type: 'New password must be a text value',
				minLength: 'New password must be at least 8 characters long',
				maxLength: 'New password cannot be longer than 32 characters',
				pattern:
					process.env.NODE_ENV === 'production'
						? 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#+-)'
						: 'Invalid password format',
			},
		},
		profile_picture: {
			type: 'string',
			pattern: '^data:image/png;base64,[A-Za-z0-9+/=]+$',
			maxLength: 1000000,
			errorMessage: {
				type: 'Profile picture must be a text value',
				pattern:
					'Profile picture must be a valid PNG image encoded in base64 format (data:image/png;base64,...)',
				maxLength: 'Profile picture file size is too large (maximum 1MB)',
			},
		},
	},
	required: [],
	additionalProperties: false,
	errorMessage: {
		additionalProperties:
			'Unknown field provided. Only username, displayName, bio, oldPassword, newPassword, and profile_picture are allowed',
	},
};

const editTitleSchema = {
	type: 'object',
	properties: {
		firstTitle: {
			type: 'string',
			maxLength: 50,
			errorMessage: {
				type: 'First title must be a text value',
				maxLength: 'First title cannot be longer than 50 characters',
			},
		},
		secondTitle: {
			type: 'string',
			maxLength: 50,
			errorMessage: {
				type: 'Second title must be a text value',
				maxLength: 'Second title cannot be longer than 50 characters',
			},
		},
		thirdTitle: {
			type: 'string',
			maxLength: 50,
			errorMessage: {
				type: 'Third title must be a text value',
				maxLength: 'Third title cannot be longer than 50 characters',
			},
		},
	},
	required: [],
	additionalProperties: false,
	errorMessage: {
		additionalProperties:
			'Unknown field provided. Only firstTitle, secondTitle, and thirdTitle are allowed',
	},
};

const profile: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	const DEFAULT_PROFILE_PIC_COUNT = 34;
	const PROFILE_PIC_OFFSET = Math.floor(Math.random() * DEFAULT_PROFILE_PIC_COUNT);
	fastify.get(
		'/:id/picture',
		{
			preValidation: [fastify.authenticate],
			schema: {
				params: {
					type: 'object',
					properties: { id: { type: 'string' } },
					required: ['id'],
				},
			},
		},
		async (req: any, reply: any) => {
			const { id } = req.params;
			const user = await getUserById(parseInt(id), fastify);
			if (!user) {
				fastify.log.info('profile');
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
			return reply
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
					fastify.log.info('edit');
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

				if (displayName && containsLetter(displayName)) {
					const lowercaseDisplayName = displayName.toLowerCase();
					if (
						lowercaseDisplayName == 'reptudn' ||
						lowercaseDisplayName == 'freddy' ||
						lowercaseDisplayName == 'lauch' ||
						lowercaseDisplayName == 'nick' ||
						lowercaseDisplayName == 'luca'
					) {
						await unlockAchievement(
							userId,
							'name-change-creator',
							fastify
						);
					}
				}
				if (typeof bio == 'string')
					if (bio.length >= 99)
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
				if (
					await updateUserPassword(
						userId,
						oldPassword,
						newPassword,
						fastify
					)
				) {
					reply.clearCookie('token', { path: '/' });
				}

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
					fastify.log.info('edit-title');
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

				await unlockAchievement(userId, 'change-title', fastify);

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
					fastify.log.info('delete');
					return reply.code(404).send({ message: 'User not found' });
				}
				const password = req.body.password;
				if (!password) {
					return reply.code(400).send({ message: 'Password is required' });
				}
				if (!(await verifyUserPassword(currentUser.id, password, fastify))) {
					return reply.code(400).send({ message: 'Incorrect password' });
				}
				const friends = await getFriends(currentUser.id, fastify);
				await deleteUser(currentUser.id, fastify);

				for (const friend of friends) {
					try {
						sendSseHtmlByUserId(friend.id, 'chat_update', '');
					} catch {}
				}
				reply.clearCookie('token', {
					path: '/',
					httpOnly: true,
					secure: process.env.NODE_ENV === 'production',
					sameSite: 'strict',
				});
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
