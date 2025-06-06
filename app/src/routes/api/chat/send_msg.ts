import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getUserById } from '../../../services/database/users';
import {
	getChatFromSql,
	getAllParticipantsFromSql,
	getMessagesFromSqlByMsgId,
} from './utils';
import {
	connectedClients,
	sendSseMessage,
} from '../../../services/sse/handler';

export async function sendMsg(fastify: FastifyInstance) {
	fastify.post(
		'/',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const body = req.body as {
				chat: number;
				message: string;
			};

			console.log('chat send test = ', body.chat);
			console.log('message send test = ', body.message);
			const user = await getUserById(
				(req.user as { id: number }).id,
				fastify
			);
			if (!user) {
				return res.status(400).send({ error: 'Unknown User' });
			}
			const group = await getChatFromSql(fastify, body.chat);
			if (!group) {
				return res.status(400).send({ error: 'Chat not Found' });
			}
			const partisipants = await getAllParticipantsFromSql(
				fastify,
				body.chat
			);
			if (!partisipants) {
				return res.status(400).send({ error: 'Users not Found' });
			}
			const msgId = await fastify.sqlite.run(
				'INSERT INTO messages (chat_id, user_id, content) VALUES (?, ? ,?)',
				[group.id, user.id, body.message]
			);

			if (msgId.changes !== 0 && typeof msgId.lastID === 'number') {
				const msg = await getMessagesFromSqlByMsgId(
					fastify,
					msgId.lastID
				);
				if (!msg)
					return res.status(400).send({ error: 'Message not Found' });
				for (const part of partisipants) {
					if (connectedClients.has(part.user_id)) {
						const client = connectedClients.get(part.user_id);
						if (client) {
							sendSseMessage(
								client,
								'chat',
								JSON.stringify({ msg })
							);
						}
					} else {
						// TODO store msg send Popup when user is connected
						/* 
						{
							part.user_id;
							msg.chatName;
						}
						*/
					}
				}
			}
			res.send({ ok: true });
		}
	);
}
