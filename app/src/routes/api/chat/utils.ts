import type { FastifyInstance } from 'fastify';
import { getChatFromSql, saveNewChatInfo, addToParticipants } from '../../../services/database/chat';

export async function inviteUserToChat(
	fastify: FastifyInstance,
	user_id: number,
	chat_id: number
) {
	const chat = await getChatFromSql(fastify, chat_id);
	if (!chat) {
		if (chat_id !== 1) {
			fastify.log.info('Error:', 'Chat not Found');
			return;
		}
		saveNewChatInfo(fastify, true, null);
	}
	addToParticipants(fastify, user_id, chat_id);
}
