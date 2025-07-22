import type { FastifyInstance } from 'fastify';
import type { Chat, Blocked, Part, Msg } from '../../types/chat';
import { sendPopupToClient } from '../sse/popup';

export class HttpError {
	statusCode: number;
	msg: string;

	constructor(code: number, msg: string) {
		this.statusCode = code;
		this.msg = msg;
	}
}

export async function saveMsgInSql(
	fastify: FastifyInstance,
	fromUserId: number,
	chatId: number,
	msgContent: string
): Promise<void> {
	try {
		fastify.sqlite.run(
			'INSERT INTO messages (chat_id, user_id, content) VALUES (?, ? ,?)',
			[chatId, fromUserId, msgContent]
		);
	} catch (err) {
		fastify.log.info(err, 'Database error saveMsgInSql'); //TODO Error msg;
		throw new HttpError(500, 'Database Error saveMsgInSql');
	}
}

export async function getAllChatsFromSqlByUserId(
	fastify: FastifyInstance,
	userId: number
): Promise<Chat[] | null> {
	try {
		const chats = (await fastify.sqlite.all(
			'SELECT c.id, c.name, c.is_group, c.created_at FROM chats AS c JOIN chat_participants AS cp ON c.id = cp.chat_id WHERE cp.user_id = ? AND c.id <> 1',
			[userId]
		)) as Chat[] | null;
		return chats;
	} catch (err) {
		fastify.log.info(err, 'Database error getAllChatsFromSqlByUserId'); //TODO Error msg;
		return null;
	}
}

export async function getFriendsDisplayname(
	fastify: FastifyInstance,
	chatId: number,
	userId: number
): Promise<{ displayname: string } | null> {
	try {
		const name = (await fastify.sqlite.get(
			'SELECT u.displayname FROM chat_participants AS cp JOIN users AS u ON cp.user_id = u.id WHERE cp.chat_id = ? AND cp.user_id <> ?',
			[chatId, userId]
		)) as { displayname: string } | null;
		return name;
	} catch (err) {
		fastify.log.info(err, 'Database error getFriendsDisplayname'); //TODO Error msg;
		return null;
	}
}

export async function getAllBlockedUser(
	fastify: FastifyInstance,
	blockedId: number
): Promise<Blocked[]> {
	try {
		const blocked = (await fastify.sqlite.all(
			'SELECT blocker_id, blocked_id, created_at FROM blocked_users WHERE blocked_id = ?',
			[blockedId]
		)) as Blocked[];
		return blocked;
	} catch (err) {
		throw new HttpError(500, 'Database Error getAllBlockedUser');
	}
}

export async function getAllBlockerUser(
	fastify: FastifyInstance,
	blockerId: number
): Promise<Blocked[]> {
	try {
		const blocked = (await fastify.sqlite.all(
			'SELECT blocker_id, blocked_id, created_at FROM blocked_users WHERE blocker_id = ?',
			[blockerId]
		)) as Blocked[];
		return blocked;
	} catch (err) {
		throw new HttpError(500, 'Database Error getAllBlockerUser');
	}
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
		throw new HttpError(500, 'Database error getAllParticipantsFromSql');
	}
}

export async function getChatFromSql(
	fastify: FastifyInstance,
	chatId: number
): Promise<Chat> {
	try {
		const chat = (await fastify.sqlite.get(
			'SELECT id, name, is_group, created_at FROM chats WHERE id = ?',
			[chatId]
		)) as Chat;
		return chat;
	} catch (err) {
		throw new HttpError(500, 'Database error getChatFromSql');
	}
}

export async function saveNewChatInfo(
	fastify: FastifyInstance,
	is_group: boolean,
	groupName: string | null
): Promise<number | null> {
	try {
		const chat = await fastify.sqlite.run(
			'INSERT INTO chats (name, is_group) VALUES (?, ?)',
			[groupName, is_group]
		);
		if (chat.changes !== 0 && typeof chat.lastID === 'number')
			return chat.lastID;
		return null;
	} catch (err) {
		fastify.log.info(err, 'Database error saveNewChatInfo'); //TODO Error msg;
		return null;
	}
}

export async function addToParticipants(
	fastify: FastifyInstance,
	fromUser: number,
	userId: number,
	chatId: number
): Promise<boolean> {
	try {
		console.log('fromUser = ', fromUser);
		console.log('userId = ', userId);
		const check = await getParticipantFromSql(fastify, userId, chatId);
		console.log('check = ', check);
		if (check) {
			sendPopupToClient(
				fastify,
				fromUser,
				'INFO',
				'User already in chat',
				'red'
			);
			return false;
		}
		fastify.sqlite.run(
			'INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)',
			[chatId, userId]
		);
	} catch (err) {
		fastify.log.info(err, 'Database error addToParticipants'); //TODO Error msg;
		return false;
	}
	return true;
}

export async function getParticipantFromSql(
	fastify: FastifyInstance,
	user_id: number,
	chat_id: number
): Promise<Part | null> {
	try {
		const user = (await fastify.sqlite.get(
			'SELECT id, chat_id, user_id FROM chat_participants WHERE chat_id = ? AND user_id = ?',
			[chat_id, user_id]
		)) as Part | null;
		return user;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
}

export async function addToBlockedUsers(
	fastify: FastifyInstance,
	blocker_id: number,
	blocked_id: number
): Promise<boolean> {
	try {
		if (!(await checkUserBlocked(fastify, blocker_id, blocked_id))) {
			await fastify.sqlite.run(
				'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)',
				[blocker_id, blocked_id]
			);
		}
	} catch (err) {
		fastify.log.info(err, 'Database error addToBlockedUsers'); //TODO Error msg;
		return false;
	}
	return true;
}

export async function checkUserBlocked(
	fastify: FastifyInstance,
	blocker_id: number,
	blocked_id: number
): Promise<boolean> {
	try {
		const blocked = (await fastify.sqlite.get(
			'SELECT blocker_id, blocked_id, created_at FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
			[blocker_id, blocked_id]
		)) as Blocked | null;
		if (!blocked) return false;
		return true;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return false;
	}
}

export async function deleteFromBlockedUsers(
	fastify: FastifyInstance,
	blocker_id: number,
	blocked_id: number
): Promise<boolean> {
	try {
		await fastify.sqlite.run(
			'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
			[blocker_id, blocked_id]
		);
	} catch (err) {
		fastify.log.info(err, 'Database error deleteFromBlockedUsers'); //TODO Error msg;
		return false;
	}
	return true;
}

export async function deleteUserFromChaParticipants(
	fastify: FastifyInstance,
	userId: number,
	chatId: number
): Promise<boolean> {
	try {
		await fastify.sqlite.run(
			'DELETE FROM chat_participants WHERE chat_id = ? AND user_id = ?',
			[chatId, userId]
		);
	} catch (err) {
		fastify.log.info(err, 'Database error deleteUserFromChaParticipants'); //TODO Error msg;
		return false;
	}
	return true;
}

export async function getMessagesFromSqlByChatId(
	fastify: FastifyInstance,
	chat_id: number
): Promise<Msg[] | null> {
	try {
		const msg = (await fastify.sqlite.all(
			'SELECT id, chat_id, user_id, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
			[chat_id]
		)) as Msg[] | null;
		return msg;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
}

export async function removeChat(
	fastify: FastifyInstance,
	chat_id: number
): Promise<boolean> {
	try {
		await fastify.sqlite.run('DELETE FROM chats WHERE id = ?', [chat_id]);
	} catch (err) {
		fastify.log.error(err, 'Database error while deleting chat');
		return false;
	}
	return true;
}

export async function searchForChatId(
	fastify: FastifyInstance,
	user_ids: number[]
): Promise<number | null> {
	const placeholders = user_ids.map(() => '?').join(',');
	const count = user_ids.length;

	try {
		const chat = await fastify.sqlite.get(
			`
		SELECT c.id
		FROM chats c
		WHERE c.is_group = 0
		  AND c.id IN (
		    SELECT chat_id
		    FROM chat_participants
		    WHERE user_id IN (${placeholders})
		    GROUP BY chat_id
		    HAVING COUNT(*) = ?
		       AND (
		         SELECT COUNT(*) FROM chat_participants cp2
		         WHERE cp2.chat_id = chat_participants.chat_id
		       ) = ?
		  )
		LIMIT 1
		`,
			[...user_ids, count, count]
		);
		return chat?.id ?? null;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
}
