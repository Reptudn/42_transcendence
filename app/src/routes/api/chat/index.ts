import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { getUserById } from '../../../services/database/users';
import { sendMsg } from './sendMsg';
import { createNewChat, addToParticipants, blockUser } from './utils';
import { getAllChats, getAllUsers, getAllMsg } from './chatGetInfo';

interface MessageQueryUser {
	group_name: string;
	user_id: string[];
}

interface MessageQueryBlock {
	user_id: string;
}

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	sendMsg(fastify);
	getAllUsers(fastify);
	getAllChats(fastify);
	getAllMsg(fastify);
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
