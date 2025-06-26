import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { htmlMsg } from '../../../types/chat';
import { getMessagesFromSqlByChatId, inviteUserToChat } from './utils';
import { getUserById } from '../../../services/database/users';
import { createHtmlMsg } from './sendMsg';
import { getFriends } from '../../../services/database/friends';
import {
	saveNewChatInfo,
	addToParticipants,
	getAllChatsFromSqlByUserId,
	getFriendsDisplayname,
	getAllBlockedUser,
	addToBlockedUsers,
	deleteFromBlockedUsers,
	deleteUserFromChaParticipants,
} from './utilsSQL';

interface MessageQueryChat {
	chat_id: number;
}

interface MessageQueryUser {
	group_name: string;
	user_id: string[];
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
				type: 'array',
				items: { type: 'string' },
			},
		},
		required: ['user_id', 'group_name'],
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
				type: 'array',
				items: { type: 'string' },
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

			const blockers = await getAllBlockedUser(fastify, userId);
			if (!blockers)
				return res.status(400).send({ error: 'Blocked Users not found' });

			const blockerId = blockers.map((b) => b.blocker_id);

			const htmlMsgs: htmlMsg[] = [];
			for (const msg of chatMsgs) {
				if (blockerId.includes(msg.user_id)) {
					msg.content = 'Msg blocked';
				}
				const user = await getUserById(msg.user_id, fastify);
				if (!user) continue;
				htmlMsgs.push(createHtmlMsg(user, null, msg.content));
			}

			res.send(htmlMsgs);
		}
	);
}

export async function getAllFriends(fastify: FastifyInstance) {
	fastify.get(
		'/friends',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const userId = (req.user as { id: number }).id;

			const friends = await getFriends(userId, fastify);

			res.send(friends);
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
			if (userChats.length === 0)
				return res.status(400).send({ error: 'No Partispants found' }); // TODO Error msg

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
			res.send(userChats);
			return;
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

			const userIdsInt = user_id
				.map((id) => Number.parseInt(id, 10))
				.filter((id) => !Number.isNaN(id));

			userIdsInt.push(user.id);

			const chat_id = await saveNewChatInfo(fastify, true, group_name);
			if (chat_id >= 0) {
				for (const id of userIdsInt) {
					addToParticipants(fastify, id, chat_id);
				}
				res.send({ chat_id: chat_id.toString() });
			} else if (chat_id === -1) {
				fastify.log.info('Not able to create a new Group');
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

			addToBlockedUsers(fastify, blockerId, Number.parseInt(user_id));
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

			deleteFromBlockedUsers(fastify, blockerId, Number.parseInt(user_id));
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

			for (const user of user_id) {
				inviteUserToChat(fastify, Number.parseInt(user), chat_id);
			}
		}
	);
}

export async function leftUserFromChat(fastify: FastifyInstance) {
	fastify.get<{ Querystring: MessageQueryChat }>(
		'/left_user',
		{
			preValidation: [fastify.authenticate],
			schema: { querystring: chatMsgRequestSchema.querystring },
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			const { chat_id } = req.query as MessageQueryChat;

			const userId = (req.user as { id: number }).id;

			deleteUserFromChaParticipants(fastify, userId, chat_id);
		}
	);
}
