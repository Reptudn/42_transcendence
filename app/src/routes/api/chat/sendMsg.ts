import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { connectedClients, sendSseMessage } from '../../../services/sse/handler';
import { getUserById } from '../../../services/database/users';
import type { Chat, Part, htmlMsg } from '../../../types/chat';
import {
	saveMsgInSql,
	getAllBlockerUser,
	getAllParticipantsFromSql,
	getChatFromSql,
} from './utilsSQL';

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

			const toUsers = await getAllParticipantsFromSql(fastify, body.chat);
			if (!toUsers)
				return res.status(400).send({ error: 'No Participants found' }); // TODO Error msg

			const chatInfo = await getChatFromSql(fastify, body.chat);
			if (!chatInfo)
				return res.status(400).send({ error: 'No Participants found' }); // TODO Error msg

			const blockers = await getAllBlockerUser(fastify, fromUser.id);
			if (!blockers)
				return res.status(400).send({ error: 'Blocked Users not found' });
			const blockedId = blockers.map((b) => b.blocked_id);

			if (!chatInfo.is_group && !chatInfo.name) {
				if (sendMsgDm(fromUser, toUsers, chatInfo, blockedId, body.message))
					saveMsgInSql(fastify, fromUser.id, body.chat, body.message);
			} else {
				sendMsgGroup(fromUser, toUsers, chatInfo, blockedId, body.message);
				saveMsgInSql(fastify, fromUser.id, body.chat, body.message);
			}
		}
	);
}

function sendMsgGroup(
	fromUser: User,
	toUsers: Part[],
	chatInfo: Chat,
	blockedId: number[],
	content: string
) {
	for (const user of toUsers) {
		if (connectedClients.has(user.user_id)) {
			let msg: htmlMsg;
			if (blockedId.includes(user.user_id))
				msg = createHtmlMsg(fromUser, chatInfo, 'Msg blocked');
			else msg = createHtmlMsg(fromUser, chatInfo, content);
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
	content: string
) {
	const msg = createHtmlMsg(fromUser, chatInfo, content);

	const user = toUser.filter((b) => b.user_id !== fromUser.id);

	if (!blockedId.includes(user[0].user_id)) {
		if (connectedClients.has(user[0].user_id)) {
			const toUser = connectedClients.get(user[0].user_id);
			if (toUser) {
				sendSseMessage(toUser, 'chat', JSON.stringify(msg));
			}
		} else {
			// TODO Client is not connected save msg and send later
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
			<p><a href='/partial/pages/profile/${fromUser.displayname}'>${fromUser.displayname}:</a>${msgContent}</p>
		</div>
		`;
	return msg;
}

