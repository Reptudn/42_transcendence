import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { getUserById } from '../../../services/database/users';
import { sendMsg } from './sendMsg';
import { blockUser } from './utils';
import { getAllChats, getAllFriends, getAllMsg, createNewChat } from './chatGetInfo';

interface MessageQueryBlock {
	user_id: string;
}

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	sendMsg(fastify);
	getAllFriends(fastify);
	getAllChats(fastify);
	getAllMsg(fastify);
	createNewChat(fastify);
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
			const user = await getUserById((req.user as { id: number }).id, fastify);
			if (!user) {
				return res.status(400).send({ error: 'Unknown User' });
			}
			blockUser(fastify, user.id, Number.parseInt(user_id));
		}
	);
};

export default chat;

// TODO Problem with checking toUser is on chat or on another side
// TODO Unblock User
// TODO invite to chat group
// TODO delete chat group
