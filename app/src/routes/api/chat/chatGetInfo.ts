import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Chat } from '../../../types/chat';
import {
	getAllUsersFromSql,
	getAllChatsFromSqlByUserId,
	getAllParticipantsFromSql,
} from './utils';
import { getUserById } from '../../../services/database/users';

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
				if (boolean(chat.is_group) === false) {
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
