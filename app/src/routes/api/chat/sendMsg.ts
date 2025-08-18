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
	getParticipantFromSql,
} from '../../../services/database/chat';
import { checkCmd } from './commands';
import { HttpError } from '../../../services/database/chat';
import { normError } from './utils';
import ejs from 'ejs';
import escapeHTML from 'escape-html';

const chatMsgRequestSchema = {
	body: {
		type: 'object',
		properties: {
			chat: { type: 'number' },
			message: {
				type: 'string',
				maxLength: 250,
				errorMessage: {
					maxLength: 'The message do not contain more than 250 chars',
				},
			},
		},
		required: ['chat', 'message'],
	},
};

export async function sendMsg(fastify: FastifyInstance) {
	fastify.post(
		'/',
		{ preValidation: [fastify.authenticate], schema: chatMsgRequestSchema },
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
					return res.status(400).send({ error: 'User not found' });

				if (body.message.startsWith('/')) {
					const msg = await checkCmd(fastify, body, fromUser.id);
					return res.status(200).send({ msg: req.t(msg) });
				}

				const toUsers = await getAllParticipantsFromSql(fastify, body.chat);

				const user = await getParticipantFromSql(
					fastify,
					fromUser.id,
					body.chat
				);
				if (!user)
					return res.status(400).send({ error: 'User is no Participant' });

				const chatInfo = await getChatFromSql(fastify, body.chat);

				const blocked = await getAllBlockerUser(fastify, fromUser.id);

				const blockedId = blocked.map((b) => b.blocked_id);

				const blocker = await getAllBlockedUser(fastify, fromUser.id);

				const blockerId = blocker.map((b) => b.blocker_id);

				if (!chatInfo.is_group && !chatInfo.name) {
					await sendMsgDm(
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
					await sendMsgGroup(
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
				res.status(200).send({ msg: 'ok' });
			} catch (err) {
				const nError = normError(err);
				res.status(nError.errorCode).send({
					error: escapeHTML(nError.errorMsg),
				});
			}
		}
	);
}

async function sendMsgGroup(
	fromUser: User,
	toUsers: Part[],
	chatInfo: Chat,
	blockerId: number[],
	content: string
): Promise<void> {
	// wenn fromUser die Person blockiert hat sende ich die nachricht normal
	// wenn formuser von der Peron blockiert wurde sende ich Msg blocket
	for (const user of toUsers) {
		if (connectedClients.has(user.user_id)) {
			const toUser = connectedClients.get(user.user_id);
			if (toUser) {
				let msg: htmlMsg;
				if (blockerId.includes(user.user_id)) {
					msg = await createHtmlMsg(
						fromUser,
						chatInfo,
						'Msg blocked',
						true,
						false
					);
				} else {
					const check = user.user_id === fromUser.id;
					msg = await createHtmlMsg(
						fromUser,
						chatInfo,
						content,
						false,
						check
					);
				}
				sendSseMessage(toUser, 'chat', JSON.stringify(msg));
			}
		}
	}
}

export async function sendMsgDm(
	fromUser: User,
	toUser: Part[],
	chatInfo: Chat,
	blockedId: number[],
	blockerId: number[],
	content: string
): Promise<void> {
	// wenn der fromUser die person blockiert hat kann man fromUser keine nachrichten mehr senden
	// wenn fromUser blockiert wurde von der person kann er die nachricht noch in den chat schreiben aber toUser bekommt sie nicht
	const user = toUser.filter((b) => b.user_id !== fromUser.id);

	if (user.length === 0) throw new HttpError(400, 'User is deleted');

	if (!blockedId.includes(user[0].user_id)) {
		if (!blockerId.includes(user[0].user_id)) {
			if (connectedClients.has(user[0].user_id)) {
				const toUser = connectedClients.get(user[0].user_id);
				if (toUser) {
					const msg = await createHtmlMsg(
						fromUser,
						chatInfo,
						content,
						false,
						false
					);
					sendSseMessage(toUser, 'chat', JSON.stringify(msg));
				}
			}
		}
		if (connectedClients.has(fromUser.id)) {
			const toUser = connectedClients.get(fromUser.id);
			if (toUser) {
				const msg = await createHtmlMsg(
					fromUser,
					chatInfo,
					content,
					false,
					true
				);
				sendSseMessage(toUser, 'chat', JSON.stringify(msg));
			}
		}
		if (!blockerId.includes(user[0].user_id)) return;
		throw new HttpError(400, 'You got blocked by the User');
	}
	throw new HttpError(400, 'User is Blocked');
}

export async function createHtmlMsg(
	fromUser: User | null,
	chatInfo: Chat | null,
	msgContent: string,
	msgBlocked: boolean,
	ownMsg: boolean
) {
	const msg: htmlMsg = {
		fromUserName: '',
		chatName: '',
		chatId: 0,
		htmlMsg: '',
		blocked: msgBlocked,
		ownMsg: ownMsg,
	};
	msg.fromUserName = fromUser ? fromUser.displayname : 'Unknown User';
	msg.chatName = chatInfo ? chatInfo.name ?? '' : '';
	msg.chatId = chatInfo ? chatInfo.id : 0;

	console.log('onwUser = ', ownMsg);

	const useTem = ownMsg ? ownTempalte : template;

	msg.htmlMsg = ejs.render(useTem, {
		userId: fromUser.id || 0,
		fromUser: fromUser ? escapeHTML(fromUser.username) : 'Deleted User',
		displayName: fromUser ? escapeHTML(fromUser.displayname) : 'Deleted User',
		msg: escapeHTML(msgContent),
	});
	return msg;
}

const template: string = `<div class="flex flex-row items-start inline-block self-start">
	<img
		src="/api/profile/<%= userId %>/picture?v=<%= Date.now() %>"
		alt="Profile Picture"
		class="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500"
	/>
	<p class="px-4 py-2 border border-green-600 bg-green-500 text-white rounded-xl">
		<a href='/partial/pages/profile/<%= fromUser %>'><%= displayName %>:</a><%= msg %>
	</p>
</div>
`;

const ownTempalte: string = `<div class="inline-block self-end">
	<p class="px-4 py-2 border border-blue-600 bg-blue-500 text-white rounded-xl">
		<a href='/partial/pages/profile/<%= fromUser %>'><%= displayName %>:</a><%= msg %>
	</p>
</div>
`;
