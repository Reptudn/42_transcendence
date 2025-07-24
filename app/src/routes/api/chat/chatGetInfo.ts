import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Blocked, htmlMsg, Msg } from '../../../types/chat';
import { invite, leave } from './utils';
import { getUserById } from '../../../services/database/users';
import { createHtmlMsg } from './sendMsg';
import { getFriends } from '../../../services/database/friends';
import {
	saveNewChatInfo,
	addToParticipants,
	getAllChatsFromSqlByUserId,
	getFriendsDisplayname,
	getAllBlockerUser,
	addToBlockedUsers,
	deleteFromBlockedUsers,
	getMessagesFromSqlByChatId,
	getChatFromSql,
	type HttpError,
	checkUserBlocked,
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
			const { chat_id } = req.query as MessageQueryChat;

			const userId = (req.user as { id: number }).id;

			const chatMsgs = await getMessagesFromSqlByChatId(fastify, chat_id);
			if (!chatMsgs)
				return res.status(400).send({ error: 'Chat Messages not found' });

			const chat = await getChatFromSql(fastify, chat_id);
			if (!chat) return res.status(400).send({ error: 'Chat not found' });

			// sind alle user die ich geblockt habe
			const blocked = await getAllBlockerUser(fastify, userId);
			if (!blocked)
				return res.status(400).send({ error: 'Blocked Users not found' });
			const blockedId = blocked.map((b) => b.blocked_id);

			let htmlMsgs: htmlMsg[] = [];

			if (Boolean(chat.is_group) === false && chat.name === null) {
				htmlMsgs = await getMsgForDm(fastify, chatMsgs, blocked, blockedId);
			} else {
				htmlMsgs = await getMsgForGroup(
					fastify,
					chatMsgs,
					blocked,
					blockedId
				);
			}

			return res.status(200).send(htmlMsgs);
		}
	);
}

async function getMsgForGroup(
	fastify: FastifyInstance,
	chatMsgs: Msg[],
	blocked: Blocked[],
	blockedId: number[]
) {
	// wenn ich geblocket wurde bekomme ich alle nachrichten normal
	// wenn ich ihn geblockt habe bekomme ich die nachrichten mit Msg blocked aber erst zum zeitpunkt des blocks

	const htmlMsgs: htmlMsg[] = [];

	for (const msg of chatMsgs) {
		const user = await getUserById(msg.user_id, fastify);
		if (!user) continue;
		if (!blockedId.includes(user.id))
			htmlMsgs.push(createHtmlMsg(user, null, msg.content));
		else {
			const pos = blockedId.indexOf(user.id);
			if (blocked[pos].created_at <= msg.created_at) {
				htmlMsgs.push(createHtmlMsg(user, null, 'Msg blocked'));
			} else htmlMsgs.push(createHtmlMsg(user, null, msg.content));
		}
	}
	return htmlMsgs;
}

async function getMsgForDm(
	fastify: FastifyInstance,
	chatMsgs: Msg[],
	blocked: Blocked[],
	blockedId: number[]
) {
	// wenn ich geblocket wurde bekomme ich alle nachrichten
	// wenn ich ihn geblockt habe bekomme ich nur die nachrichten bis zum block

	const htmlMsgs: htmlMsg[] = [];

	for (const msg of chatMsgs) {
		const user = await getUserById(msg.user_id, fastify);
		if (!user) continue;
		if (!blockedId.includes(user.id))
			htmlMsgs.push(createHtmlMsg(user, null, msg.content));
		else {
			const pos = blockedId.indexOf(user.id);
			if (blocked[pos].created_at <= msg.created_at) return htmlMsgs;
			htmlMsgs.push(createHtmlMsg(user, null, msg.content));
		}
	}
	return htmlMsgs;
}

export async function getAllFriends(fastify: FastifyInstance) {
	fastify.get(
		'/friends',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const userId = (req.user as { id: number }).id;

			const friends = await getFriends(userId, fastify);

			return res.status(200).send(friends);
		}
	);
}

export async function getAllChats(fastify: FastifyInstance) {
	fastify.get(
		'/chats',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const userId = (req.user as { id: number }).id;

			const userChats = await getAllChatsFromSqlByUserId(fastify, userId);
			if (!userChats)
				return res.status(400).send({ error: 'No Participants found' }); // TODO Error msg

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
			return res.status(200).send(userChats);
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
			const { group_name, user_id } = req.query as MessageQueryUser;

			const user = await getUserById((req.user as { id: number }).id, fastify);
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

			try {
				const chat_id = await saveNewChatInfo(fastify, true, group_name);

				for (const id of userIdsInt) {
					addToParticipants(fastify, id, chat_id);
				}

				return res.send({
					chat_id: chat_id.toString(),
					msg: 'Group successfully created',
				});
			} catch (err) {
				const errorClass = err as HttpError;
				return res
					.status(errorClass.statusCode)
					.send({ error: errorClass.msg });
			}
		}
	);
}

// TODO function after this need to get checkt

export async function blockUsers(fastify: FastifyInstance) {
	fastify.get<{ Querystring: MessageQueryBlock }>(
		'/block_user',
		{
			preValidation: [fastify.authenticate],
			schema: { querystring: chatBlockRequestSchema.querystring },
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			const { user_id } = req.query as MessageQueryBlock;

			const blockerId = (req.user as { id: number }).id;

			try {
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
				const errorClass = err as HttpError;
				return res
					.status(errorClass.statusCode)
					.send({ error: errorClass.msg });
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
			const { user_id } = req.query as MessageQueryBlock;

			const blockerId = (req.user as { id: number }).id;

			try {
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
				const errorClass = err as HttpError;
				res.status(errorClass.statusCode).send({ error: errorClass.msg });
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

			try {
				await invite(fastify, chat_id, myId, userIdsInt);
				return res
					.status(200)
					.send({ msg: 'User get successfully invited' });
			} catch (err) {
				const errorClass = err as HttpError;
				return res
					.status(errorClass.statusCode)
					.send({ error: errorClass.msg });
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
			const { chat_id } = req.query as MessageQueryChat;

			const userId = (req.user as { id: number }).id;

			try {
				await leave(fastify, chat_id, userId);
				return res.status(200).send({msg: You have successfully left the group});
			} catch (err) {
				const errorClass = err as HttpError;
				return res.status(errorClass.statusCode).send({error: errorClass.msg});
			}
		}
	);
}
