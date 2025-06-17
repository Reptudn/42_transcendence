import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
	getAllParticipantsFromSql,
	checkUserBlocked,
	getChatFromSql,
} from './utils';
import {
	connectedClients,
	sendSseMessage,
} from '../../../services/sse/handler';
import { getUserById } from '../../../services/database/users';
import type { Chat, htmlMsg } from '../../../types/chat';

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
			if (!fromUser)
				return res.status(400).send({ error: 'User not found' }); // TODO Error msg

			saveMsgInSql(fastify, fromUser.id, body.chat, body.message);

			const toUsers = await getAllParticipantsFromSql(fastify, body.chat);
			if (!toUsers)
				return res.status(400).send({ error: 'No Participants found' }); // TODO Error msg

			const chatInfo = await getChatFromSql(fastify, body.chat);
			if (!chatInfo)
				return res.status(400).send({ error: 'No Participants found' }); // TODO Error msg

			for (const user of toUsers) {
				if (connectedClients.has(user.user_id)) {
					let msg: htmlMsg;
					if (
						await checkUserBlocked(
							fastify,
							user.user_id,
							fromUser.id
						)
					) {
						body.message = 'Msg blocked';
					}
					msg = createHtmlMsg(fromUser, chatInfo, body.message);
					const toUser = connectedClients.get(user.user_id);
					if (toUser)
						sendSseMessage(toUser, 'chat', JSON.stringify(msg));
					continue;
				}
				// TODO Client is not connected save msg and send later
			}
		}
	);
}

async function saveMsgInSql(
	fastify: FastifyInstance,
	fromUserId: number,
	chatId: number,
	msgContent: string
) {
	try {
		fastify.sqlite.run(
			'INSERT INTO messages (chat_id, user_id, content) VALUES (?, ? ,?)',
			[chatId, fromUserId, msgContent]
		);
	} catch (err) {
		fastify.log.info(err, 'Database error'); //TODO Error msg;
	}
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

// TODO Problem with checking toUser is on chat or on another side
