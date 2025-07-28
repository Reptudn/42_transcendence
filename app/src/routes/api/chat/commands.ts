import type { FastifyInstance } from 'fastify';
import { getUserByUsername } from '../../../services/database/users';
import { sendPopupToClient } from '../../../services/sse/popup';
import { invite, leave } from './utils';
import { HttpError } from '../../../services/database/chat';
import { getFriends } from '../../../services/database/friends';
import type { Friend } from '../../../types/chat';

export async function checkCmd(
	fastify: FastifyInstance,
	body: { chat: number; message: string },
	fromUser: number
) {
	const parts = body.message.trim().split(' ');
	const cmd = parts[0];

	const args = parts.slice(1, parts.length);

	console.log('cmd = ', cmd);
	console.log('args = ', args);

	if (args.length > 2) {
		sendPopupToClient(fastify, fromUser, 'INFO', 'Wrong nbr of args', 'red');
		return;
	}

	switch (cmd) {
		case '/invite':
			await inviteCmd(fastify, body.chat, fromUser, args);
			break;
		case '/msg':
			break; // TODO great succes;
		case '/leave':
			await leaveCmd(fastify, body.chat, fromUser, args);
			break;
		default:
			// invalid command
			break;
	}
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
		await invite(fastify, chatID, fromUser, toUser.id);
	} else {
		throw new HttpError(400, 'Wrong nbr of args');
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
		sendPopupToClient(fastify, fromUser, 'INFO', 'Wrong nbr of args', 'red');
		return;
	}
}

// TODO Commands

// /invite username
// /msg username message
// /leave
// /whois username
// /help
