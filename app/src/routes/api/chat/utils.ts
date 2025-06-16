import type { FastifyInstance } from 'fastify';
import type { Chat, Part, Msg, User } from './index';

interface Blocked {
	blocker_id: number;
	blocked_id: number;
	created_at: string;
}

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
		createNewChat(fastify, true, null);
	}
	addToParticipants(fastify, user_id, chat_id);
}

export async function getChatFromSql(
	fastify: FastifyInstance,
	chat_id: number
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
	chat_id: number
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

export async function getAllParticipantsFromSql(
	fastify: FastifyInstance,
	chat_id: number
): Promise<Part[] | null> {
	let user: Part[] | null;
	try {
		user = (await fastify.sqlite.all(
			'SELECT id, chat_id, user_id FROM chat_participants WHERE chat_id = ?',
			[chat_id]
		)) as Part[] | null;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
	return user;
}

export async function getAllChatsFromSqlByUserId(
	fastify: FastifyInstance,
	user_id: number
) {
	let chats: Part[] | null;
	try {
		chats = (await fastify.sqlite.all(
			'SELECT id, chat_id, user_id FROM chat_participants WHERE user_id = ?',
			[user_id]
		)) as Part[] | null;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
	return chats;
}

export async function getAllUsersFromSql(fastify: FastifyInstance) {
	let users: User[] | null;
	try {
		users = (await fastify.sqlite.all(
			'SELECT	id, google_id, username, password, displayname, bio, profile_picture, click_count, title_first, title_second, title_third FROM users'
		)) as User[] | null;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
	return users;
}

export async function getMessagesFromSqlByChatId(
	fastify: FastifyInstance,
	chat_id: number
) {
	let msg: Msg[] | null;
	try {
		msg = (await fastify.sqlite.all(
			'SELECT messages.id, messages.chat_id, messages.user_id, users.displayname AS displayname, messages.content, messages.created_at FROM messages JOIN users ON messages.user_id = users.id WHERE chat_id = ? ORDER BY created_at ASC',
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
			'SELECT messages.id, messages.chat_id, messages.user_id, chats.name AS chatName, users.displayname AS displayname, messages.content, messages.created_at FROM messages JOIN chats ON messages.chat_id = chats.id JOIN users ON messages.user_id = users.id WHERE messages.id = ?',
			[msg_id]
		)) as Msg | null;
		console.log('msg Test inside = ', msg);
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
		return null;
	}
	return msg;
}

export function addToParticipants(
	fastify: FastifyInstance,
	user_id: number,
	chat_id: number
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

export async function createNewChat(
	fastify: FastifyInstance,
	is_group: boolean,
	groupName: string | null
) {
	try {
		const chat = await fastify.sqlite.run(
			'INSERT INTO chats (name, is_group) VALUES (?, ?)',
			[groupName, is_group]
		);
		if (chat.changes !== 0 && typeof chat.lastID === 'number')
			return chat.lastID;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
	}
}

export async function removeChat(fastify: FastifyInstance, chat_id: number) {
	try {
		console.log('remove Chat_id = ', chat_id);
		await fastify.sqlite.run('DELETE FROM chats WHERE id = ?', [chat_id]);
	} catch (err) {
		fastify.log.error(err, 'Database error while deleting chat');
	}
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
	}
	return null;
}

export async function blockUser(
	fastify: FastifyInstance,
	blocker_id: number,
	blocked_id: number
) {
	try {
		await fastify.sqlite.run(
			'INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)',
			[blocker_id, blocked_id]
		);
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
	}
}

export async function checkUserBlocked(
	fastify: FastifyInstance,
	blocker_id: number,
	blocked_id: number
) {
	try {
		const blocked = (await fastify.sqlite.get(
			'SELECT blocker_id, blocked_id, created_at FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?',
			[blocker_id, blocked_id]
		)) as Blocked | null;
		if (!blocked) return false;
		return true;
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
	}
}
