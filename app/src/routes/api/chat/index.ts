import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { getUserById } from '../../../services/database/users';
import { sendMsg } from './sendMsg';
import {
	getChatFromSql,
	getMessagesFromSqlByChatId,
	getParticipantFromSql,
	createNewChat,
	addToParticipants,
	blockUser,
	checkUserBlocked,
} from './utils';
import { getAllChats, getAllUsers } from './chatGetInfo';

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

export interface Msg {
	id: number;
	chat_id: number;
	user_id: number;
	chatName: string;
	blocked: boolean;
	displayname: string;
	content: string;
	created_at: string;
}

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	sendMsg(fastify);
	getAllUsers(fastify);
	getAllChats(fastify);
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
			for (const msg of messages) {
				const check = await checkUserBlocked(
					fastify,
					user.id,
					msg.user_id
				);
				if (typeof check === 'undefined') continue;
				msg.blocked = check;
			}
			res.send(messages);
		}
	);
	fastify.get<{ Querystring: MessageQueryUser }>(
		'/create',
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
			const userIdsInt = user_id
				.map((id) => Number.parseInt(id, 10))
				.filter((id) => !Number.isNaN(id));
			if (!userIdsInt.includes(user.id)) userIdsInt.push(user.id);
			let chat_id: number | undefined = 0;
			if (userIdsInt.length <= 2)
				chat_id = await createNewChat(fastify, false, group_name);
			else chat_id = await createNewChat(fastify, true, group_name);
			if (chat_id !== undefined) {
				for (const id of userIdsInt) {
					addToParticipants(fastify, id, chat_id);
				}
				res.send({ chat_id: chat_id.toString() });
			}
		}
	);
	fastify.get<{ Querystring: MessageQueryBlock }>(
		'/block_user',
		{
			preValidation: [fastify.authenticate],
			schema: {
				querystring: {
					type: 'object',
					properties: {
						user_id: { type: 'string' },
					},
					required: ['user_id'],
				},
			},
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			const { user_id } = req.query as MessageQueryBlock;
			const user = await getUserById(
				(req.user as { id: number }).id,
				fastify
			);
			if (!user) {
				return res.status(400).send({ error: 'Unknown User' });
			}
			blockUser(fastify, user.id, Number.parseInt(user_id));
		}
	);
};

export default chat;
