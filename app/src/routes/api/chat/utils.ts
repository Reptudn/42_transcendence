import type { FastifyInstance } from 'fastify';
import {
	getChatFromSql,
	saveNewChatInfo,
	addToParticipants,
	deleteUserFromChaParticipants,
	getAllParticipantsFromSql,
	removeChat,
} from '../../../services/database/chat';
import { sendPopupToClient } from '../../../services/sse/popup';

export async function inviteUserToChat(
	fastify: FastifyInstance,
	fromUser: number,
	user_id: number,
	chat_id: number
) {
	const chat = await getChatFromSql(fastify, chat_id);
	if (!chat) {
		if (chat_id !== 1) {
			sendPopupToClient(fastify, fromUser, 'INFO', 'Chat not found', 'red');
			return false;
		}
		saveNewChatInfo(fastify, true, null);
	}
	addToParticipants(fastify, fromUser, user_id, chat_id);
	return true;
}

export async function invite(
	fastify: FastifyInstance,
	chat_id: number,
	fromUser: number,
	toUser: number | number[]
) {
	const chat = await getChatFromSql(fastify, chat_id);
	if (!chat) return null;

	if (chat.name === null) {
		let chatName: string;
		if (chat.is_group) chatName = 'global';
		else chatName = 'private';
		return sendPopupToClient(
			fastify,
			fromUser,
			'INFO',
			`You not able to invite a user to the ${chatName} chat`,
			'red'
		);
	}

	if (typeof toUser === 'object') {
		for (const user of toUser) {
			await inviteUserToChat(fastify, user, fromUser, chat_id);
		}
	} else {
		await inviteUserToChat(fastify, toUser, fromUser, chat_id);
	}

	sendPopupToClient(
		fastify,
		fromUser,
		'INFO',
		'User gets successfully invited',
		'green'
	);
}

export async function leave(
	fastify: FastifyInstance,
	chat_id: number,
	fromUser: number
) {
	const chat = await getChatFromSql(fastify, chat_id);
	if (!chat) {
		return sendPopupToClient(fastify, fromUser, 'INFO', 'Chat not Found', 'red');
	}

	if (chat.name === null) {
		let chatName: string;
		if (chat.is_group) chatName = 'global';
		else chatName = 'private';
		return sendPopupToClient(
			fastify,
			fromUser,
			'INFO',
			`You not able to leave the ${chatName} chat`,
			'red'
		);
	}

	deleteUserFromChaParticipants(fastify, fromUser, chat_id);

	const check = await getAllParticipantsFromSql(fastify, chat_id);
	if (check.length === 0) {
		removeChat(fastify, chat_id);
	}
	sendPopupToClient(
		fastify,
		fromUser,
		'INFO',
		'You have successfully left the chat',
		'red'
	);
}
