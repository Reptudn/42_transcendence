import type { FastifyInstance } from 'fastify';
import type { Blocked, Msg, htmlMsg } from '../../../types/chat';
import { createHtmlMsg } from './sendMsg';
import { getUserById } from '../../../services/database/users';
import {
	getChatFromSql,
	addToParticipants,
	deleteUserFromChatParticipants,
	getAllParticipantsFromSql,
	HttpError,
	removeChat,
	getAllBlockerUser,
} from '../../../services/database/chat';
import { sendPopupToClient } from '../../../services/sse/popup';

export async function inviteUserToChat(
	fastify: FastifyInstance,
	formUser: number,
	user_id: number,
	chat_id: number
): Promise<void> {
	await getChatFromSql(fastify, chat_id);
	const Blocked = await getAllBlockerUser(fastify, formUser);
	const blockedInt = Blocked.map((block) => block.blocked_id);
	if (blockedInt.includes(user_id))
		throw new HttpError(400, 'You have blocked the User');
	await addToParticipants(fastify, user_id, chat_id);
	if (formUser === user_id) return;
	sendPopupToClient(
		fastify,
		user_id,
		'INFO',
		'You got invited to a Chat',
		'yellow'
	);
}

export async function invite(
	fastify: FastifyInstance,
	chat_id: number,
	fromUser: number,
	toUser: number | number[]
) {
	const chat = await getChatFromSql(fastify, chat_id);

	if (chat.name === null) {
		let chatName: string;
		if (chat.is_group) chatName = 'global';
		else chatName = 'private';
		throw new HttpError(
			400,
			`You not able to invite a user to the ${chatName} chat`
		);
	}

	if (typeof toUser === 'object') {
		for (const user of toUser) {
			await inviteUserToChat(fastify, fromUser, user, chat_id);
		}
	} else {
		await inviteUserToChat(fastify, fromUser, toUser, chat_id);
	}
}

export async function leave(
	fastify: FastifyInstance,
	chat_id: number,
	fromUser: number
) {
	const chat = await getChatFromSql(fastify, chat_id);

	if (chat.name === null) {
		const chatName = chat.is_group ? 'global' : 'private';
		throw new HttpError(400, `You not able to leave the ${chatName} chat`);
	}

	deleteUserFromChatParticipants(fastify, fromUser, chat_id);

	const check = await getAllParticipantsFromSql(fastify, chat_id);
	if (check && check.length === 0) {
		removeChat(fastify, chat_id);
	}
}

export async function getMsgForGroup(
	fastify: FastifyInstance,
	chatMsgs: Msg[],
	blocked: Blocked[],
	blockedId: number[]
) {
	// wenn ich geblocket wurde bekomme ich alle nachrichten normal
	// wenn ich ihn geblockt habe bekomme ich die nachrichten mit Msg blocked aber erst zum zeitpunkt des blocks

	const htmlMsgs: htmlMsg[] = [];

	for (const msg of chatMsgs) {
		const user = await getUserById(msg.user_id, fastify);
		if (!user) {
			htmlMsgs.push(await createHtmlMsg(null, null, msg.content, false));
			continue;
		}
		if (!blockedId.includes(user.id))
			htmlMsgs.push(await createHtmlMsg(user, null, msg.content, false));
		else {
			const pos = blockedId.indexOf(user.id);
			if (blocked[pos].created_at <= msg.created_at) {
				htmlMsgs.push(await createHtmlMsg(user, null, 'Msg blocked', true));
			} else
				htmlMsgs.push(await createHtmlMsg(user, null, msg.content, false));
		}
	}
	return htmlMsgs;
}

export async function getMsgForDm(
	fastify: FastifyInstance,
	chatMsgs: Msg[],
	blocked: Blocked[],
	blockedId: number[]
) {
	// wenn ich geblocket wurde bekomme ich alle nachrichten
	// wenn ich ihn geblockt habe bekomme ich nur die nachrichten bis zum block

	const htmlMsgs: htmlMsg[] = [];

	for (const msg of chatMsgs) {
		const user = await getUserById(msg.user_id, fastify);
		if (!user) {
			htmlMsgs.push(await createHtmlMsg(null, null, msg.content, false));
			continue;
		}
		if (!blockedId.includes(user.id))
			htmlMsgs.push(await createHtmlMsg(user, null, msg.content, false));
		else {
			const pos = blockedId.indexOf(user.id);
			if (blocked[pos].created_at <= msg.created_at) return htmlMsgs;
			htmlMsgs.push(await createHtmlMsg(user, null, msg.content, false));
		}
	}
	return htmlMsgs;
}

export function normError(err: unknown) {
	let errorCode: number;
	let errorMsg: string;

	if (err instanceof HttpError) {
		errorCode = err.statusCode;
		errorMsg = err.msg;
	} else if (err instanceof Error) {
		errorCode = 500;
		errorMsg = err.message;
	} else if (typeof err === 'string') {
		errorCode = 500;
		errorMsg = err;
	} else {
		errorCode = 500;
		errorMsg = 'Unknown Error';
	}
	return { errorCode, errorMsg };
}
