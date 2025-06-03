import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { getUserById } from '../../../services/database/users';
import {
	connectedClients,
	sendSseMessage,
} from '../../../services/sse/handler';

import {
	getChatFromSql,
	getMessagesFromSqlByChatId,
	getMessagesFromSqlByMsgId,
	getParticipantFromSql,
	getAllParticipantsFromSql,
	getAllChatsFromSqlByUserId,
	generateChatId,
	createNewChat,
	addToParticipants,
} from './utils';

interface MessageQueryChat {
	chat_id: string;
}

interface MessageQueryUser {
	user_id: string[];
}

export interface Chat {
	id: string;
	name: string | null;
	is_group: boolean;
	created_at: string;
}

export interface Part {
	id: number;
	chat_id: string;
	user_id: number;
}

export interface Msg {
	id: number;
	chat_id: string;
	displayname: string;
	content: string;
	created_at: string;
}

interface User {
	id: number;
	google_id: string;
	username: string;
	password: string;
	displayname: string;
	bio: string;
	profile_picture: string;
	click_count: number;
	title_first: number;
	title_second: number;
	title_third: number;
}

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post(
		'/',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const body = req.body as {
				chat: string;
				is_group?: boolean;
				message: string;
			};

			const user = await getUserById(
				(req.user as { id: number }).id,
				fastify
			);
			if (!user) {
				return res.status(400).send({ error: 'Unknown User' });
			}
			const newChatId = body.chat;
			// if (body.chat !== '0')
			// 	newChatId = generateChatId([
			// 		Number.parseInt(body.chat),
			// 		user.id,
			// 	]);
			const group = await getChatFromSql(fastify, newChatId);
			if (!group) {
				return res.status(400).send({ error: 'Chat not Found' });
			}
			// const partisipant = await getParticipantFromSql(
			// 	fastify,
			// 	user.id,
			// 	newChatId
			// );
			// if (!partisipant) {
			// 	return res.status(400).send({ error: 'User has no Access' });
			// }
			const partisipants = await getAllParticipantsFromSql(
				fastify,
				newChatId
			);
			fastify.log.info(partisipants);
			if (!partisipants) {
				return res.status(400).send({ error: 'Users not Found' });
			}
			const msgId = await fastify.sqlite.run(
				'INSERT INTO messages (chat_id, user_id, content) VALUES (?, ? ,?)',
				[group.id, user.id, body.message]
			);

			if (msgId.changes !== 0 && typeof msgId.lastID === 'number') {
				const msg = await getMessagesFromSqlByMsgId(
					fastify,
					msgId.lastID
				);
				if (!msg)
					return res.status(400).send({ error: 'Message not Found' });
				console.log('msg Test =', msg);
				for (const part of partisipants) {
					if (connectedClients.has(part.user_id)) {
						const client = connectedClients.get(part.user_id);
						if (client) {
							sendSseMessage(
								client,
								'chat',
								JSON.stringify({ msg })
							);
						}
					}
				}
			}
			res.send({ ok: true });
		}
	);

	fastify.get(
		'/users',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const users = (await fastify.sqlite.all(
				'SELECT id, google_id, username, password, displayname, bio, profile_picture, click_count, title_first, title_second, title_third FROM users'
			)) as User[];
			res.send(users);
		}
	);
	fastify.get(
		'/chats',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const user = await getUserById(
				(req.user as { id: number }).id,
				fastify
			);
			if (!user) {
				return res.status(400).send({ error: 'Unknown User' });
			}
			const userPart = await getAllChatsFromSqlByUserId(fastify, user.id);
			if (!userPart) return; // TODO Error msg
			const chats: Chat[] = [];
			for (const part of userPart) {
				const chat = (await fastify.sqlite.get(
					'SELECT id, name, is_group, created_at FROM chats WHERE id = ?',
					[part.chat_id]
				)) as Chat;
				chats.push(chat);
			}
			res.send(chats);
		}
	);
	fastify.get<{ Querystring: MessageQueryChat }>(
		'/messages',
		{
			preValidation: [fastify.authenticate],
			schema: {
				querystring: {
					type: 'object',
					properties: {
						chat_id: { type: 'string' },
					},
					required: ['chat_id'],
				},
			},
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			const { chat_id } = req.query as MessageQueryChat;
			const user = await getUserById(
				(req.user as { id: number }).id,
				fastify
			);
			if (!user) {
				return res.status(400).send({ error: 'Unknown User' });
			}
			const newChatId = chat_id;

			const chat = await getChatFromSql(fastify, newChatId);
			if (!chat) {
				return res.status(400).send({ error: 'Chat not Found' });
			}
			const partisipant = getParticipantFromSql(
				fastify,
				user.id,
				newChatId
			);
			if (!partisipant) {
				return res.status(400).send({ error: 'Partisipant not Found' });
			}
			const messages = await getMessagesFromSqlByChatId(
				fastify,
				newChatId
			);
			if (!messages) {
				return res.status(400).send({ error: 'Messages not Found' });
			}
			res.send(messages);
		}
	);
	fastify.get<{ Querystring: MessageQueryUser }>(
		'/invite',
		{
			preValidation: [fastify.authenticate],
			schema: {
				querystring: {
					type: 'object',
					properties: {
						user_id: {
							type: 'array',
							items: { type: 'string' },
						},
					},
					required: ['user_id'],
				},
			},
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			const { user_id } = req.query as MessageQueryUser;
			const user = await getUserById(
				(req.user as { id: number }).id,
				fastify
			);
			if (!user) {
				return res.status(400).send({ error: 'Unknown User' });
			}
			let newChatId = '0';
			const userIdsInt = user_id
				.map((id) => Number.parseInt(id, 10))
				.filter((id) => !Number.isNaN(id));
			if (!userIdsInt.includes(user.id)) userIdsInt.push(user.id);
			newChatId = generateChatId(userIdsInt);
			const chat = await getChatFromSql(fastify, newChatId);
			if (!chat) {
				if (userIdsInt.length <= 2)
					createNewChat(fastify, newChatId, false);
				else createNewChat(fastify, newChatId, true);
				for (const id of userIdsInt) {
					addToParticipants(fastify, id, newChatId);
				}
			}
			res.send({ chat_id: newChatId });
		}
	);
};

export default chat;
