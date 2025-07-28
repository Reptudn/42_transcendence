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
	fastify.sqlite.run(
		'INSERT INTO messages (chat_id, user_id, content) VALUES (?, ? ,?)',
		[chatId, fromUserId, msgContent]
	);
}

export async function getAllChatsFromSqlByUserId(
	fastify: FastifyInstance,
	userId: number
): Promise<Chat[]> {
	const chats = (await fastify.sqlite.all(
		'SELECT c.id, c.name, c.is_group, c.created_at FROM chats AS c JOIN chat_participants AS cp ON c.id = cp.chat_id WHERE cp.user_id = ? AND c.id <> 1',
		[userId]
	)) as Chat[] | null;
	if (!chats) throw new HttpError(400, 'No Chatparticipants found');
	return chats;
}

export async function getFriendsDisplayname(
	fastify: FastifyInstance,
	chatId: number,
	userId: number
): Promise<{ displayname: string } | null> {
	const name = (await fastify.sqlite.get(
		'SELECT u.displayname FROM chat_participants AS cp JOIN users AS u ON cp.user_id = u.id WHERE cp.chat_id = ? AND cp.user_id <> ?',
		[chatId, userId]
	)) as { displayname: string } | null;
	if (!name) {
		sendPopupToClient(fastify, userId, 'Error', 'User not found', 'red');
		return null;
	}
	return name;
}

export async function getAllBlockedUser(
	fastify: FastifyInstance,
	blockedId: number
): Promise<Blocked[]> {
	const blocked = (await fastify.sqlite.all(
		'SELECT blocker_id, blocked_id, created_at FROM blocked_users WHERE blocked_id = ?',
		[blockedId]
	)) as Blocked[];
	return blocked;
}

export async function getAllBlockerUser(
	fastify: FastifyInstance,
	blockerId: number
): Promise<Blocked[]> {
	const blocked = (await fastify.sqlite.all(
		'SELECT blocker_id, blocked_id, created_at FROM blocked_users WHERE blocker_id = ?',
		[blockerId]
	)) as Blocked[];
	return blocked;
}

export async function getAllParticipantsFromSql(
	fastify: FastifyInstance,
	chatId: number
): Promise<Part[]> {
	const user = (await fastify.sqlite.all(
		'SELECT id, chat_id, user_id FROM chat_participants WHERE chat_id = ?',
		[chatId]
	)) as Part[];
	return user;
}

export async function getChatFromSql(
	fastify: FastifyInstance,
	chatId: number
): Promise<Chat> {
	const chat = (await fastify.sqlite.get(
		'SELECT id, name, is_group, created_at FROM chats WHERE id = ?',
		[chatId]
	)) as Chat | null;
	if (!chat) throw new HttpError(404, 'Chat not found');
	return chat;
}

export async function saveNewChatInfo(
	fastify: FastifyInstance,
	is_group: boolean,
	groupName: string | null
): Promise<number> {
	const chat = await fastify.sqlite.run(
		'INSERT INTO chats (name, is_group) VALUES (?, ?)',
		[groupName, is_group]
	);
	if (chat.changes !== 0 && typeof chat.lastID === 'number') return chat.lastID;
	throw new HttpError(400, 'Failed to save the Chat');
}

export async function addToParticipants(
	fastify: FastifyInstance,
	userId: number,
	chatId: number
): Promise<void> {
	const user = await getParticipantFromSql(fastify, userId, chatId);
	if (user) {
		throw new HttpError(400, 'User already in Chat');
	}
	fastify.sqlite.run(
		'INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)',
		[chatId, userId]
	);
}

export async function getParticipantFromSql(
	fastify: FastifyInstance,
	user_id: number,
	chat_id: number
): Promise<Part | null> {
	const user = (await fastify.sqlite.get(
		'SELECT id, chat_id, user_id FROM chat_participants WHERE chat_id = ? AND user_id = ?',
		[chat_id, user_id]
	)) as Part | null;
	return user;
}

export async function addToBlockedUsers(
	fastify: FastifyInstance,
	blocker_id: number,
	blocked_id: number
): Promise<void> {
	if (!(await checkUserBlocked(fastify, blocker_id, blocked_id))) {
		await fastify.sqlite.run(
			'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)',
			[blocker_id, blocked_id]
		);
	}
}

export async function checkUserBlocked(
	fastify: FastifyInstance,
	blocker_id: number,
	blocked_id: number
): Promise<boolean> {
	const blocked = (await fastify.sqlite.get(
		'SELECT blocker_id, blocked_id, created_at FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
		[blocker_id, blocked_id]
	)) as Blocked | null;
	if (!blocked) return false;
	return true;
}

export async function deleteFromBlockedUsers(
	fastify: FastifyInstance,
	blocker_id: number,
	blocked_id: number
): Promise<void> {
	await fastify.sqlite.run(
		'DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
		[blocker_id, blocked_id]
	);
}

export async function deleteUserFromChatParticipants(
	fastify: FastifyInstance,
	userId: number,
	chatId: number
): Promise<void> {
	await fastify.sqlite.run(
		'DELETE FROM chat_participants WHERE chat_id = ? AND user_id = ?',
		[chatId, userId]
	);
}

export async function getMessagesFromSqlByChatId(
	fastify: FastifyInstance,
	chat_id: number
): Promise<Msg[]> {
	const msg = (await fastify.sqlite.all(
		'SELECT id, chat_id, user_id, content, created_at FROM messages WHERE chat_id = ? ORDER BY created_at ASC',
		[chat_id]
	)) as Msg[] | null;
	if (!msg) throw new HttpError(400, 'No messages found');
	return msg;
}

export async function removeChat(
	fastify: FastifyInstance,
	chat_id: number
): Promise<void> {
	await fastify.sqlite.run('DELETE FROM chats WHERE id = ?', [chat_id]);
}

export async function searchForChatId(
	fastify: FastifyInstance,
	user_ids: number[]
): Promise<number | null> {
	const placeholders = user_ids.map(() => '?').join(',');
	const count = user_ids.length;

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
}
