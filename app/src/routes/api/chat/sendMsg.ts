import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { connectedClients, sendSseMessage } from '../../../services/sse/handler';
import { getUserById } from '../../../services/database/users';
import type { Chat, Part, htmlMsg } from '../../../types/chat';
import {
	saveMsgInSql,
	getAllBlockedUser,
	getAllBlockerUser,
	getAllParticipantsFromSql,
	getChatFromSql,
} from '../../../services/database/chat';

import { invite } from './chatGetInfo';
import { getUserByUsername } from '../../../services/database/users 2';

export async function sendMsg(fastify: FastifyInstance) {
	fastify.post(
		'/',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const body = req.body as {
				chat: number;
				message: string;
			};

			const fromUser = await getUserById(
				(req.user as { id: number }).id,
				fastify
			);

			if (!fromUser) return res.status(400).send({ error: 'User not found' }); // TODO Error msg

			if (body.message !== '' && body.message[0] === '/')
				return checkCmd(fastify, body, fromUser.id);

			const toUsers = await getAllParticipantsFromSql(fastify, body.chat);
			if (!toUsers)
				return res.status(400).send({ error: 'No Participants found' }); // TODO Error msg

			const chatInfo = await getChatFromSql(fastify, body.chat);
			if (!chatInfo)
				return res.status(400).send({ error: 'No Participants found' }); // TODO Error msg

			// sind alle user die ich geblockt habe
			const blocked = await getAllBlockerUser(fastify, fromUser.id);
			if (!blocked)
				return res.status(400).send({ error: 'Blocked Users not found' });
			const blockedId = blocked.map((b) => b.blocked_id);

			// sind all user die mich blockiert haben
			const blocker = await getAllBlockedUser(fastify, fromUser.id);
			if (!blocker)
				return res.status(400).send({ error: 'Blocked Users not found' });
			const blockerId = blocker.map((b) => b.blocker_id);

			if (!chatInfo.is_group && !chatInfo.name) {
				if (
					sendMsgDm(
						fromUser,
						toUsers,
						chatInfo,
						blockedId,
						blockerId,
						body.message
					)
				)
					saveMsgInSql(fastify, fromUser.id, body.chat, body.message);
			} else {
				sendMsgGroup(fromUser, toUsers, chatInfo, blockerId, body.message);
				saveMsgInSql(fastify, fromUser.id, body.chat, body.message);
			}
		}
	);
}

function sendMsgGroup(
	fromUser: User,
	toUsers: Part[],
	chatInfo: Chat,
	blockerId: number[],
	content: string
) {
	// wenn fromUser die Person blockiert hat kommt sende ich die nachricht normal
	// wenn formuser von der Peron blockiert wurde sende ich Msg blocket
	for (const user of toUsers) {
		if (connectedClients.has(user.user_id)) {
			let msg: htmlMsg;
			if (blockerId.includes(user.user_id)) {
				msg = createHtmlMsg(fromUser, chatInfo, 'Msg blocked');
			} else msg = createHtmlMsg(fromUser, chatInfo, content);
			const toUser = connectedClients.get(user.user_id);
			if (toUser) {
				sendSseMessage(toUser, 'chat', JSON.stringify(msg));
			}
			// continue;
		}
		// TODO Client is not connected save msg and send later
	}
}

function sendMsgDm(
	fromUser: User,
	toUser: Part[],
	chatInfo: Chat,
	blockedId: number[],
	blockerId: number[],
	content: string
) {
	// wenn der fromUser die person blockiert hat kann man fromUser keine nachrichten mehr senden
	// wenn fromUser blockiert wurde von der person kann er die nachricht noch in den chat schreiben aber toUser bekommt sie nicht
	const user = toUser.filter((b) => b.user_id !== fromUser.id);

	if (!blockedId.includes(user[0].user_id)) {
		const msg = createHtmlMsg(fromUser, chatInfo, content);
		if (!blockerId.includes(user[0].user_id)) {
			if (connectedClients.has(user[0].user_id)) {
				const toUser = connectedClients.get(user[0].user_id);
				if (toUser) {
					sendSseMessage(toUser, 'chat', JSON.stringify(msg));
				}
			} else {
				// TODO Client is not connected save msg and send later
			}
		}
		if (connectedClients.has(fromUser.id)) {
			const toUser = connectedClients.get(fromUser.id);
			if (toUser) {
				sendSseMessage(toUser, 'chat', JSON.stringify(msg));
			}
		}
		return true;
	}
	return false;
}

export function createHtmlMsg(
	fromUser: User,
	chatInfo: Chat | null,
	msgContent: string
) {
	const msg: htmlMsg = {
		fromUserName: '',
		chatName: '',
		chatId: 0,
		htmlMsg: '',
	};
	msg.fromUserName = fromUser.displayname;
	msg.chatName = chatInfo ? chatInfo.name ?? '' : '';
	msg.chatId = chatInfo ? chatInfo.id : 0;
	msg.htmlMsg = `
		<div>
			<p><a href='/partial/pages/profile/${fromUser.username}'>${fromUser.displayname}:</a>${msgContent}</p>
		</div>
		`;
	return msg;
}

async function checkCmd(
	fastify: FastifyInstance,
	body: { chat: number; message: string },
	fromUser: number
) {
	const parts = body.message.trim().split(' ');
	const cmd = parts[0];

	if (!cmd.startsWith('/')) return;

	const args = parts.slice(1, parts.length);

	console.log('cmd = ', cmd);
	console.log('args = ', args);

	switch (cmd) {
		case '/invite':
			if (args.length === 1) {
				const toUser = await getUserByUsername(args[0], fastify);
				if (!toUser) break; //TODO error
				await invite(fastify, body.chat, fromUser, toUser.id);
			} else {
				break; //TODO error
			}
			break; // TODO great succes;
		case '/msg':
			break; // TODO great succes;
		default:
			// invalid command
			break;
	}

	if (body.message.includes('/msg')) {
	}
	if (body.message.includes('/leave')) {
	}
	if (body.message.includes('/whois')) {
	}
	if (body.message.includes('/help')) {
	}
}

// TODO Commands

// /invite username
// /msg username message
// /leave
// /whois username
// /help
