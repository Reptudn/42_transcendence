import type { FastifyInstance } from 'fastify';
import type { Chat, Blocked, Part } from '../../../types/chat';

export async function saveMsgInSql(
	fastify: FastifyInstance,
	fromUserId: number,
	chatId: number,
	msgContent: string
) {
	try {
		fastify.sqlite.run(
			'INSERT INTO messages (chat_id, user_id, content) VALUES (?, ? ,?)',
			[chatId, fromUserId, msgContent]
		);
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
	}
}

export async function getAllChatsFromSqlByUserId(
	fastify: FastifyInstance,
	userId: number
) {
	try {
		const chats = (await fastify.sqlite.all(
			'SELECT c.id, c.name, c.is_group, c.created_at FROM chats AS c JOIN chat_participants AS cp ON c.id = cp.chat_id WHERE cp.user_id = ? AND c.id <> 1',
			[userId]
		)) as Chat[];
		return chats;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return [];
	}
}

export async function getFriendsDisplayname(
	fastify: FastifyInstance,
	chatId: number,
	userId: number
) {
	try {
		const name = (await fastify.sqlite.get(
			'SELECT u.displayname FROM chat_participants AS cp JOIN users AS u ON cp.user_id = u.id WHERE cp.chat_id = ? AND cp.user_id <> ?',
			[chatId, userId]
		)) as { displayname: string };
		return name;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
}

export async function getAllBlockedUserId(
	fastify: FastifyInstance,
	blockedId: number
) {
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

export async function getAllBlockerUser(
	fastify: FastifyInstance,
	blockerId: number
) {
	try {
		const blocked = (await fastify.sqlite.all(
			'SELECT blocker_id, blocked_id, created_at FROM blocked_users WHERE blocker_id = ?',
			[blockerId]
		)) as Blocked[] | null;
		return blocked;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
	}
	return null;
}

export async function getAllParticipantsFromSql(
	fastify: FastifyInstance,
	chatId: number
): Promise<Part[]> {
	try {
		const user = (await fastify.sqlite.all(
			'SELECT id, chat_id, user_id FROM chat_participants WHERE chat_id = ?',
			[chatId]
		)) as Part[];
		return user;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return [];
	}
}

export async function getChatFromSql(
	fastify: FastifyInstance,
	chatId: number
): Promise<Chat | null> {
	let chat: Chat | null;
	try {
		chat = (await fastify.sqlite.get(
			'SELECT id, name, is_group, created_at FROM chats WHERE id = ?',
			[chatId]
		)) as Chat | null;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
	return chat;
}
