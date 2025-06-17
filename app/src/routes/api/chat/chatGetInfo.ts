import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Chat, Blocked, htmlMsg } from '../../../types/chat';
import {
	getAllUsersFromSql,
	getAllChatsFromSqlByUserId,
	getAllParticipantsFromSql,
	getMessagesFromSqlByChatId,
} from './utils';
import { getUserById } from '../../../services/database/users';
import { createHtmlMsg } from './sendMsg';

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
				return res
					.status(400)
					.send({ error: 'Chat Messages not found' });

			const blockers = await getAllBlockedUser(fastify, userId);
			if (!blockers)
				return res
					.status(400)
					.send({ error: 'Blocked Users not found' });

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

async function getAllBlockedUser(fastify: FastifyInstance, blockedId: number) {
	try {
		const blocked = (await fastify.sqlite.all(
			'SELECT blocker_id, blocked_id, created_at FROM blocked_users WHERE blocked_id = ?',
			[blockedId]
		)) as Blocked[] | null;
		return blocked;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
	}
	return null;
}

// export async function getAllMsg(fastify: FastifyInstance) {
// 	fastify.get<{ Querystring: MessageQueryChat }>(
// 		'/messages',
// 		{
// 			preValidation: [fastify.authenticate],
// 			schema: { body: chatMsgRequestSchema },
// 		},
// 		async (req: FastifyRequest, res: FastifyReply) => {
// 			const { chat_id } = req.query as MessageQueryChat;
// 			const user = await getUserById(
// 				(req.user as { id: number }).id,
// 				fastify
// 			);
// 			if (!user) {
// 				return res.status(400).send({ error: 'Unknown User' });
// 			}
// 			const newChatId = chat_id;

// 			const chat = await getChatFromSql(fastify, newChatId);
// 			if (!chat) {
// 				return res.status(400).send({ error: 'Chat not Found' });
// 			}
// 			const partisipant = getParticipantFromSql(
// 				fastify,
// 				user.id,
// 				newChatId
// 			);
// 			if (!partisipant) {
// 				return res.status(400).send({ error: 'Partisipant not Found' });
// 			}
// 			const messages = await getMessagesFromSqlByChatId(
// 				fastify,
// 				newChatId
// 			);
// 			if (!messages) {
// 				return res.status(400).send({ error: 'Messages not Found' });
// 			}
// 			for (const msg of messages) {
// 				const check = await checkUserBlocked(
// 					fastify,
// 					user.id,
// 					msg.user_id
// 				);
// 				if (typeof check === 'undefined') continue;
// 				msg.blocked = check;
// 			}
// 			res.send(messages);
// 		}
// 	);
// }

export async function getAllUsers(fastify: FastifyInstance) {
	fastify.get(
		'/users',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const users = await getAllUsersFromSql(fastify);
			if (!users) {
				return res.status(400).send({ error: 'Users not Found' });
			}
			const updateUsers = users.filter(
				(user) => user.id !== (req.user as { id: number }).id
			);
			res.send(updateUsers);
		}
	);
}

export async function getAllChats(fastify: FastifyInstance) {
	fastify.get(
		'/chats',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const user_id = (req.user as { id: number }).id;
			const userPart = await getAllChatsFromSqlByUserId(fastify, user_id);
			if (!userPart)
				return res.status(400).send({ error: 'No Partispants found' }); // TODO Error msg
			const chats: Chat[] = [];
			for (const part of userPart) {
				const chat = (await fastify.sqlite.get(
					'SELECT id, name, is_group, created_at FROM chats WHERE id = ?',
					[part.chat_id]
				)) as Chat;
				if (chat.id !== 1) chats.push(chat);
			}
			for (const chat of chats) {
				console.log('chat is group = ', chat.is_group);
				if (Boolean(chat.is_group) === false) {
					const parts = await getAllParticipantsFromSql(
						fastify,
						chat.id
					);
					if (!parts)
						return res
							.status(400)
							.send({ error: 'No Partispants found' }); // TODO Error msg
					for (const part of parts) {
						if (part.user_id !== user_id) {
							const user = await getUserById(
								part.user_id,
								fastify
							);
							if (!user)
								return res
									.status(400)
									.send({ error: 'User not Found' }); // TODO Error msg
							chat.name = user.displayname;
							console.log('chat name = ', chat.name);
						}
					}
				}
			}
			res.send(chats);
			return;
		}
	);
}
