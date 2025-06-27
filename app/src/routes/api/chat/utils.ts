import type { FastifyInstance } from 'fastify';
import { getChatFromSql, saveNewChatInfo, addToParticipants } from './utilsSQL';

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

// export async function getAllUsersFromSql(fastify: FastifyInstance) {
// 	let users: User[] | null;
// 	try {
// 		users = (await fastify.sqlite.all(
// 			'SELECT	id, google_id, username, password, displayname, bio, profile_picture, click_count, title_first, title_second, title_third FROM users'
// 		)) as User[] | null;
// 	} catch (err) {
// 		fastify.log.info(err, 'Database error'); //TODO Error msg;
// 		return null;
// 	}
// 	return users;
// }

// export async function getMessagesFromSqlByMsgId(
// 	fastify: FastifyInstance,
// 	msg_id: number
// ) {
// 	let msg: Msg | null;
// 	try {
// 		msg = (await fastify.sqlite.get(
// 			'SELECT messages.id, messages.chat_id, messages.user_id, chats.name AS chatName, users.displayname AS displayname, messages.content, messages.created_at FROM messages JOIN chats ON messages.chat_id = chats.id JOIN users ON messages.user_id = users.id WHERE messages.id = ?',
// 			[msg_id]
// 		)) as Msg | null;
// 		console.log('msg Test inside = ', msg);
// 	} catch (err) {
// 		fastify.log.info(err, 'Database error'); //TODO Error msg;
// 		return null;
// 	}
// 	return msg;
// }

export async function removeChat(fastify: FastifyInstance, chat_id: number) {
	try {
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
