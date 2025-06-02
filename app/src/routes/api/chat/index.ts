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
	generateChatId,
	createNewChat,
	addToParticipants,
} from './utils';

interface MessageQuery {
	chat_id: number;
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
	user_id: number;
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
			let newChatId = '0';
			if (body.chat !== '0')
				newChatId = generateChatId([
					Number.parseInt(body.chat),
					user.id,
				]);
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
			if (!partisipants || !Array.isArray(partisipants)) {
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
	fastify.get<{ Querystring: MessageQuery }>(
		'/messages',
		{
			preValidation: [fastify.authenticate],
			schema: {
				querystring: {
					type: 'object',
					properties: {
						chat_id: { type: 'number' },
					},
					required: ['chat_id'],
				},
			},
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			const { chat_id } = req.query as MessageQuery;
			const user = await getUserById(
				(req.user as { id: number }).id,
				fastify
			);
			if (!user) {
				return res.status(400).send({ error: 'Unknown User' });
			}
			let newChatId = '0';
			if (chat_id !== 0) newChatId = generateChatId([chat_id, user.id]);

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
	fastify.get<{ Querystring: MessageQuery }>(
		'/invite',
		{
			preValidation: [fastify.authenticate],
			schema: {
				querystring: {
					type: 'object',
					properties: {
						chat_id: { type: 'number' },
					},
					required: ['chat_id'],
				},
			},
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			const { chat_id } = req.query as MessageQuery;
			const user = await getUserById(
				(req.user as { id: number }).id,
				fastify
			);
			if (!user) {
				return res.status(400).send({ error: 'Unknown User' });
			}
			let newChatId = '0';
			if (chat_id !== 0) newChatId = generateChatId([chat_id, user.id]);
			const chat = await getChatFromSql(fastify, newChatId);
			if (!chat) {
				createNewChat(fastify, newChatId, false);
				addToParticipants(fastify, user.id, newChatId);
				if (user.id !== chat_id)
					addToParticipants(fastify, chat_id, newChatId);
			}
			res.send({ ok: true });
		}
	);
};

export default chat;
