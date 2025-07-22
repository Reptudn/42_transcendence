import type { FastifyInstance } from 'fastify';
import { getUserByUsername } from '../../../services/database/users';
import { sendPopupToClient } from '../../../services/sse/popup';
import { invite, leave } from './utils';

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
			sendPopupToClient(fastify, fromUser, 'INFO', 'User not found', 'red');
			return;
		}
		await invite(fastify, chatID, fromUser, toUser.id);
	} else {
		sendPopupToClient(fastify, fromUser, 'INFO', 'Wrong nbr of args', 'red');
		return;
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
