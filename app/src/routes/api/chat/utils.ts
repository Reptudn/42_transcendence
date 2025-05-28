import type { FastifyInstance } from 'fastify';
import type { Chat, Part, Msg } from './index';

export async function inviteUserToChat(
	fastify: FastifyInstance,
	user_id: number,
	chat_id: string
) {
	const chat = await getChatFromSql(fastify, chat_id);
	if (!chat) {
		if (chat_id !== '0') {
			fastify.log.info('Error:', 'Chat not Found');
			return;
		}
		createNewChat(fastify, chat_id, true);
	}
	addToParticipants(fastify, user_id, chat_id);
}

export async function getChatFromSql(
	fastify: FastifyInstance,
	chat_id: string
): Promise<Chat | null> {
	let chat: Chat | null;
	try {
		chat = (await fastify.sqlite.get(
			'SELECT id, name, is_group, created_at FROM chats WHERE id = ?',
			[chat_id]
		)) as Chat | null;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
	return chat;
}

export async function getParticipantFromSql(
	fastify: FastifyInstance,
	user_id: number,
	chat_id: string
): Promise<Part | null> {
	let user: Part | null;
	try {
		user = (await fastify.sqlite.get(
			'SELECT id, chat_id, user_id FROM chat_participants WHERE chat_id = ? AND user_id = ?',
			[chat_id, user_id]
		)) as Part | null;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
	return user;
}

export async function getMessagesFromSqlByChatId(
	fastify: FastifyInstance,
	chat_id: string
) {
	let msg: Msg[] | null;
	try {
		msg = (await fastify.sqlite.all(
			'SELECT id, chat_id, user_id, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
			[chat_id]
		)) as Msg[] | null;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
	return msg;
}

export async function getMessagesFromSqlByMsgId(
	fastify: FastifyInstance,
	msg_id: number
) {
	let msg: Msg | null;
	try {
		msg = (await fastify.sqlite.get(
			'SELECT id, chat_id, user_id, content, created_at FROM messages WHERE id = ?',
			[msg_id]
		)) as Msg | null;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
	return msg;
}

export function addToParticipants(
	fastify: FastifyInstance,
	user_id: number,
	chat_id: string
) {
	try {
		fastify.sqlite.run(
			'INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)',
			[chat_id, user_id]
		);
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
	}
}

export function createNewChat(
	fastify: FastifyInstance,
	chat_id: string,
	is_group: boolean
) {
	try {
		fastify.sqlite.run('INSERT INTO chats (id, is_group) VALUES (?, ?)', [
			chat_id,
			is_group,
		]);
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
	}
}

export function generateChatId(users: number[]): string {
	return users.sort((a, b) => a - b).join('_');
}
