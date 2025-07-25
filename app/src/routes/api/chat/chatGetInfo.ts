import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { htmlMsg } from '../../../types/chat';
import {
	invite,
	leave,
	getMsgForDm,
	getMsgForGroup,
	normError,
	inviteUserToChat,
} from './utils';
import { getUserById } from '../../../services/database/users';
import {
	saveNewChatInfo,
	getAllChatsFromSqlByUserId,
	getFriendsDisplayname,
	getAllBlockerUser,
	addToBlockedUsers,
	deleteFromBlockedUsers,
	getMessagesFromSqlByChatId,
	getChatFromSql,
	checkUserBlocked,
	getParticipantFromSql,
} from '../../../services/database/chat';

interface MessageQueryChat {
	chat_id: number;
}

interface MessageQueryUser {
	group_name: string;
	user_id: string[] | string;
}

interface MessageQueryBlock {
	user_id: string;
}

interface MessageQueryInvite {
	chat_id: number;
	user_id: string[];
}

const chatMsgRequestSchema = {
	querystring: {
		type: 'object',
		properties: {
			chat_id: { type: 'string' },
		},
		required: ['chat_id'],
	},
};

const chatCreateRequestSchema = {
	querystring: {
		type: 'object',
		properties: {
			user_id: {
				oneOf: [
					{ type: 'string' },
					{ type: 'array', items: { type: 'string' } },
				],
			},
			group_name: {
				type: 'string',
			},
		},
		required: ['group_name', 'user_id'],
	},
};

const chatBlockRequestSchema = {
	querystring: {
		type: 'object',
		properties: {
			user_id: { type: 'string' },
		},
		required: ['user_id'],
	},
};

const chatInviteRequestSchema = {
	querystring: {
		type: 'object',
		properties: {
			user_id: {
				oneOf: [
					{ type: 'string' },
					{ type: 'array', items: { type: 'string' } },
				],
			},
			chat_id: {
				type: 'string',
			},
		},
		required: ['user_id', 'chat_id'],
	},
};

export async function getAllMsg(fastify: FastifyInstance) {
	fastify.get<{ Querystring: MessageQueryChat }>(
		'/messages',
		{
			preValidation: [fastify.authenticate],
			schema: { querystring: chatMsgRequestSchema.querystring },
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			try {
				const { chat_id } = req.query as MessageQueryChat;

				const userId = (req.user as { id: number }).id;

				const user = await getParticipantFromSql(fastify, userId, chat_id);
				if (!user)
					return res.status(400).send({ error: 'User is no Participant' });

				const chatMsgs = await getMessagesFromSqlByChatId(fastify, chat_id);

				const chat = await getChatFromSql(fastify, chat_id);

				const blocked = await getAllBlockerUser(fastify, userId);

				const blockedId = blocked.map((b) => b.blocked_id);

				let htmlMsgs: htmlMsg[] = [];

				if (Boolean(chat.is_group) === false && chat.name === null) {
					htmlMsgs = await getMsgForDm(
						fastify,
						chatMsgs,
						blocked,
						blockedId
					);
				} else {
					htmlMsgs = await getMsgForGroup(
						fastify,
						chatMsgs,
						blocked,
						blockedId
					);
				}

				return res.status(200).send({ msgs: htmlMsgs });
			} catch (err) {
				const nError = normError(err);
				return res.status(nError.errorCode).send({ error: nError.errorMsg });
			}
		}
	);
}

export async function getAllChats(fastify: FastifyInstance) {
	fastify.get(
		'/chats',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			try {
				const userId = (req.user as { id: number }).id;

				const userChats = await getAllChatsFromSqlByUserId(fastify, userId);

				for (const chat of userChats) {
					if (Boolean(chat.is_group) === false) {
						const name = await getFriendsDisplayname(
							fastify,
							chat.id,
							userId
						);
						if (name) chat.name = name.displayname;
					}
				}
				return res.status(200).send({ chats: userChats });
			} catch (err) {
				const nError = normError(err);
				res.status(nError.errorCode).send({ error: nError.errorMsg });
			}
		}
	);
}

export async function createNewChat(fastify: FastifyInstance) {
	fastify.get<{ Querystring: MessageQueryUser }>(
		'/create',
		{
			preValidation: [fastify.authenticate],
			schema: { querystring: chatCreateRequestSchema.querystring },
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			try {
				const { group_name, user_id } = req.query as MessageQueryUser;

				const user = await getUserById(
					(req.user as { id: number }).id,
					fastify
				);
				if (!user) {
					return res.status(400).send({ error: 'Unknown User' });
				}

				let userIdsInt: number[] = [];
				if (typeof user_id === 'object') {
					userIdsInt = user_id
						.map((id) => Number.parseInt(id, 10))
						.filter((id) => !Number.isNaN(id));
				} else {
					userIdsInt.push(Number.parseInt(user_id));
				}

				userIdsInt.push(user.id);

				const chat_id = await saveNewChatInfo(fastify, true, group_name);

				for (const id of userIdsInt) {
					inviteUserToChat(fastify, user.id, id, chat_id);
				}

				return res.send({
					chat_id: chat_id.toString(),
					msg: 'Group successfully created',
				});
			} catch (err) {
				const nError = normError(err);
				return res.status(nError.errorCode).send({ error: nError.errorMsg });
			}
		}
	);
}

export async function blockUsers(fastify: FastifyInstance) {
	fastify.get<{ Querystring: MessageQueryBlock }>(
		'/block_user',
		{
			preValidation: [fastify.authenticate],
			schema: { querystring: chatBlockRequestSchema.querystring },
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			try {
				const { user_id } = req.query as MessageQueryBlock;

				const blockerId = (req.user as { id: number }).id;

				if (
					await checkUserBlocked(
						fastify,
						blockerId,
						Number.parseInt(user_id)
					)
				)
					return res.status(400).send({ error: 'User already blocked' });

				addToBlockedUsers(fastify, blockerId, Number.parseInt(user_id));
				return res.status(200).send({ msg: 'User blocked successfully' });
			} catch (err) {
				const nError = normError(err);
				return res.status(nError.errorCode).send({ error: nError.errorMsg });
			}
		}
	);
}

export async function unblockUsers(fastify: FastifyInstance) {
	fastify.get<{ Querystring: MessageQueryBlock }>(
		'/unblock_user',
		{
			preValidation: [fastify.authenticate],
			schema: { querystring: chatBlockRequestSchema.querystring },
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			try {
				const { user_id } = req.query as MessageQueryBlock;

				const blockerId = (req.user as { id: number }).id;

				if (
					!(await checkUserBlocked(
						fastify,
						blockerId,
						Number.parseInt(user_id)
					))
				)
					return res.status(400).send({ error: 'User is not blocked' });
				deleteFromBlockedUsers(fastify, blockerId, Number.parseInt(user_id));
				return res
					.status(200)
					.send({ msg: 'User get successfully blocked' });
			} catch (err) {
				const nError = normError(err);
				res.status(nError.errorCode).send({ error: nError.errorMsg });
			}
		}
	);
}

export async function inviteUser(fastify: FastifyInstance) {
	fastify.get<{ Querystring: MessageQueryInvite }>(
		'/invite_user',
		{
			preValidation: [fastify.authenticate],
			schema: { querystring: chatInviteRequestSchema.querystring },
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			try {
				const { chat_id, user_id } = req.query as MessageQueryInvite;

				const myId = (req.user as { id: number }).id;

				let userIdsInt: number[] = [];
				if (typeof user_id === 'object') {
					userIdsInt = user_id
						.map((id) => Number.parseInt(id, 10))
						.filter((id) => !Number.isNaN(id));
				} else {
					userIdsInt.push(Number.parseInt(user_id));
				}

				await invite(fastify, chat_id, myId, userIdsInt);

				// for (const user of userIdsInt) {
				// 	sendPopupToClient(
				// 		fastify,
				// 		user,
				// 		'INFO',
				// 		'You got invited to a new Group',
				// 		'yellow'
				// 	);
				// }

				return res
					.status(200)
					.send({ msg: 'User get successfully invited' });
			} catch (err) {
				const nError = normError(err);
				return res.status(nError.errorCode).send({ error: nError.errorMsg });
			}
		}
	);
}

export async function leaveUserFromChat(fastify: FastifyInstance) {
	fastify.get<{ Querystring: MessageQueryChat }>(
		'/leave_user',
		{
			preValidation: [fastify.authenticate],
			schema: { querystring: chatMsgRequestSchema.querystring },
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			try {
				const { chat_id } = req.query as MessageQueryChat;

				const userId = (req.user as { id: number }).id;

				await leave(fastify, chat_id, userId);

				return res
					.status(200)
					.send({ msg: 'You have successfully left the group' });
			} catch (err) {
				const nError = normError(err);
				return res.status(nError.errorCode).send({ error: nError.errorMsg });
			}
		}
	);
}
