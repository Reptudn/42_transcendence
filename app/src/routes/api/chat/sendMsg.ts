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
import { checkCmd } from './commands';
import { HttpError } from '../../../services/database/chat';
import { sendPopupToClient } from '../../../services/sse/popup';

//TODO req.body checken

export async function sendMsg(fastify: FastifyInstance) {
	fastify.post(
		'/',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			try {
				const body = req.body as {
					chat: number;
					message: string;
				};

				const fromUser = await getUserById(
					(req.user as { id: number }).id,
					fastify
				);

				if (!fromUser)
					return res.status(400).send({ error: 'User not found' }); // TODO Error msg

				if (body.message.startsWith('/'))
					return await checkCmd(fastify, body, fromUser.id);

				const toUsers = await getAllParticipantsFromSql(fastify, body.chat);

				const chatInfo = await getChatFromSql(fastify, body.chat);

				// sind alle user die ich geblockt habe
				const blocked = await getAllBlockerUser(fastify, fromUser.id);

				const blockedId = blocked.map((b) => b.blocked_id);

				// sind all user die mich blockiert haben
				const blocker = await getAllBlockedUser(fastify, fromUser.id);

				const blockerId = blocker.map((b) => b.blocker_id);

				if (!chatInfo.is_group && !chatInfo.name) {
					sendMsgDm(
						fromUser,
						toUsers,
						chatInfo,
						blockedId,
						blockerId,
						body.message
					);
					await saveMsgInSql(
						fastify,
						fromUser.id,
						body.chat,
						body.message
					);
				} else {
					sendMsgGroup(
						fromUser,
						toUsers,
						chatInfo,
						blockerId,
						body.message
					);
					await saveMsgInSql(
						fastify,
						fromUser.id,
						body.chat,
						body.message
					);
				}
			} catch (err) {
				const errorClass = err as HttpError;

				if (errorClass.statusCode < 500) {
					sendPopupToClient(
						fastify,
						(req.user as { id: number }).id,
						'Error',
						errorClass.msg,
						'red'
					);
				}
				res.status(errorClass.statusCode).send({ error: errorClass.msg });
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
): void {
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
): void {
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
		return;
	}
	throw new HttpError(400, 'User is Blocked');
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
