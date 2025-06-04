import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { getUserById } from '../../../services/database/users';
import { sendMsg } from './send_msg';
import {
	getChatFromSql,
	getMessagesFromSqlByChatId,
	getParticipantFromSql,
	getAllChatsFromSqlByUserId,
	generateChatId,
	createNewChat,
	addToParticipants,
} from './utils';

interface MessageQueryChat {
	chat_id: string;
}

interface MessageQueryUser {
	group_name: string;
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
	sendMsg(fastify);
	fastify.get(
		'/users',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const users = (await fastify.sqlite.all(
				'SELECT id, google_id, username, password, displayname, bio, profile_picture, click_count, title_first, title_second, title_third FROM users'
			)) as User[];
			const updateUsers = users.filter(
				(user) => user.id !== (req.user as { id: number }).id
			);
			res.send(updateUsers);
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
				if (chat.id !== '0') chats.push(chat);
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
					required: ['user_id', 'group_name'],
				},
			},
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			const { group_name, user_id } = req.query as MessageQueryUser;
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
					createNewChat(fastify, newChatId, false, group_name);
				else createNewChat(fastify, newChatId, true, group_name);
				for (const id of userIdsInt) {
					addToParticipants(fastify, id, newChatId);
				}
			}
			res.send({ chat_id: newChatId });
		}
	);
};

export default chat;
