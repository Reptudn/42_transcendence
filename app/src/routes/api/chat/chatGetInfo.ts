import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { htmlMsg } from '../../../types/chat';
import { getMessagesFromSqlByChatId } from './utils';
import { getUserById } from '../../../services/database/users';
import { createHtmlMsg } from './sendMsg';
import { getFriends } from '../../../services/database/friends';
import {
	getAllChatsFromSqlByUserId,
	getFriendsDisplayname,
	getAllBlockedUserId,
} from './utilsSQL';

interface MessageQueryChat {
	chat_id: number;
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
				return res.status(400).send({ error: 'Chat Messages not f ound' });

			const blockers = await getAllBlockedUserId(fastify, userId);
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
