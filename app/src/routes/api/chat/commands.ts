import type { FastifyInstance } from 'fastify';
import { getUserById, getUserByUsername } from '../../../services/database/users';
import { invite, leave } from './utils';
import {
	HttpError,
	getChatFromSql,
	getParticipantFromSql,
	searchForChatId,
	getAllBlockerUser,
	getAllBlockedUser,
	saveMsgInSql,
} from '../../../services/database/chat';
import { getFriends } from '../../../services/database/friends';
import { sendMsgDm } from './sendMsg';

export async function checkCmd(
	fastify: FastifyInstance,
	body: { chat: number; message: string },
	fromUser: number
): Promise<string> {
	const parts = body.message.trim().split(' ');
	const cmd = parts[0];
	let msg = 'Command executed';

	const args = parts.slice(1, parts.length);

	switch (cmd) {
		case '/invite':
			await inviteCmd(fastify, body.chat, fromUser, args);
			msg = 'chat.invite';
			break;
		case '/msg':
			await sendMsgCmd(fastify, fromUser, args);
			break;
		case '/leave':
			await leaveCmd(fastify, body.chat, fromUser, args);
			msg = 'chat.leave';
			break;
		case '/help':
			msg = '/invite<br>/msg</br>/leave';
			break;
		default:
			throw new HttpError(400, `Invalid Command: ${cmd}`);
	}
	return msg;
}

async function inviteCmd(
	fastify: FastifyInstance,
	chatID: number,
	fromUser: number,
	args: string[]
) {
	if (args.length === 1) {
		const toUser = await getUserByUsername(args[0], fastify);
		if (!toUser) {
			throw new HttpError(400, 'User not found');
		}
		const friends = await getFriends(fromUser, fastify);
		if (friends.some((user) => user.id === toUser.id))
			await invite(fastify, chatID, fromUser, toUser.id);
		else throw new HttpError(400, 'User not found');
	} else {
		throw new HttpError(400, 'Wrong Number of Command Arguments');
	}
}

async function leaveCmd(
	fastify: FastifyInstance,
	chatId: number,
	fromUser: number,
	args: string[]
) {
	if (args.length === 0) {
		await leave(fastify, chatId, fromUser);
	} else {
		throw new HttpError(400, 'Wrong Number of Command Arguments');
	}
}

async function sendMsgCmd(
	fastify: FastifyInstance,
	fromUser: number,
	args: string[]
) {
	if (args.length < 2)
		throw new HttpError(400, 'Wrong Number of Command Arguments');
	const user = await getUserById(fromUser, fastify);
	if (!user) throw new HttpError(400, 'User not found');

	const toUser = await getUserByUsername(args[0], fastify);
	if (!toUser) throw new HttpError(400, 'User not found');

	const chatId = await searchForChatId(fastify, [user.id, toUser.id]);
	if (!chatId) throw new HttpError(400, 'Chat not found');

	const chat = await getChatFromSql(fastify, chatId);

	const part = await getParticipantFromSql(fastify, toUser.id, chatId);
	if (!part) throw new HttpError(400, 'No Participant in Chat');

	const blocked = await getAllBlockerUser(fastify, user.id);

	const blockedId = blocked.map((b) => b.blocked_id);

	const blocker = await getAllBlockedUser(fastify, user.id);

	const blockerId = blocker.map((b) => b.blocker_id);

	args.shift();
	const msg = args.join(' ');
	sendMsgDm(user, [part], chat, blockedId, blockerId, msg);
	await saveMsgInSql(fastify, user.id, chatId, msg);
}
