import type { FastifyInstance, FastifyReply } from 'fastify';
import {
	getChatFromSql,
	addToParticipants,
	deleteUserFromChaParticipants,
	getAllParticipantsFromSql,
	HttpError,
	removeChat,
} from '../../../services/database/chat';
import { sendPopupToClient } from '../../../services/sse/popup';

export async function inviteUserToChat(
	fastify: FastifyInstance,
	user_id: number,
	chat_id: number
): Promise<void> {
	try {
		await getChatFromSql(fastify, chat_id);
		await addToParticipants(fastify, user_id, chat_id);
	} catch (err) {
		if (err instanceof HttpError) throw err;
	}
}

export async function invite(
	fastify: FastifyInstance,
	chat_id: number,
	fromUser: number,
	toUser: number | number[]
) {
	try {
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
				await inviteUserToChat(fastify, user, chat_id);
			}
		} else {
			await inviteUserToChat(fastify, toUser, chat_id);
		}
	} catch (err) {
		if (err instanceof HttpError) throw err;
	}
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
	if (check && check.length === 0) {
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

export function catchFunction(
	fastify: FastifyInstance,
	err: HttpError,
	userId: number,
	res: FastifyReply
) {
	const errorClass = err as HttpError;

	if (errorClass.statusCode < 500) {
		sendPopupToClient(fastify, userId, 'Error', errorClass.msg, 'red');
	}
	res.status(errorClass.statusCode).send({ error: errorClass.msg });
}
