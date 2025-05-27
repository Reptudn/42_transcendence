import {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyReply,
	FastifyRequest,
} from 'fastify';
import { getUserById } from '../../../services/database/users';
import {
	connectedClients,
	sendSseMessage,
} from '../../../services/sse/handler';

interface MessageQuery {
	chat_id: number;
}

interface Chat {
	id: number;
	name: string | null;
	is_group: boolean;
	created_at: string;
}

interface Part {
	id: number;
	chat_id: number;
	user_id: number;
}

interface Msg {
	id: number;
	chat_id: number;
	user_id: number;
	content: string;
	created_at: string;
}

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post(
		'/',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			const body = req.body as {
				chat?: string;
				is_group?: boolean;
				message?: string;
			};

			const user = await getUserById(
				(req.user as { id: number }).id,
				fastify
			);
			if (!user) {
				return res.status(400).send({ error: 'Unknown User' });
			}

			let group = await fastify.sqlite.get(
				'SELECT id, name, is_group FROM chats WHERE id = ?',
				[body.chat]
			);

			if (!group) {
				await fastify.sqlite.run(
					'INSERT INTO chats (id, is_group) VALUES (?, ?)',
					[body.chat, body.is_group]
				);
				group = await fastify.sqlite.get(
					'SELECT id, name, is_group FROM chats WHERE name = ?',
					[body.chat]
				);
			}

			await fastify.sqlite.run(
				'INSERT INTO messages (chat_id, user_id, content) VALUES (?, ? ,?)',
				[group.id, user.id, body.message]
			);

			for (const [, client] of connectedClients) {
				sendSseMessage(
					client,
					'chat',
					JSON.stringify({
						user: user.displayname,
						message: body.message,
					})
				);
			}
			res.send({ ok: true });
		}
	);

	fastify.get(
		'/users',
		{ preValidation: [fastify.authenticate] },
		async (req: FastifyRequest, res: FastifyReply) => {
			// const user = await getUserById(
			// 	(req.user as { id: number }).id,
			// 	fastify
			// );
			const users = await fastify.sqlite.all(
				'SELECT id, username, displayname FROM users'
			);
			res.send(users);
		}
	);
	fastify.get<{ Querystring: MessageQuery }>(
		'/messages',
		{
			preValidation: [fastify.authenticate],
			schema: {
				querystring: {
					type: 'object',
					properties: {
						chat_id: { type: 'number' },
					},
					required: ['chat_id'],
				},
			},
		},
		async (req: FastifyRequest, res: FastifyReply) => {
			const { chat_id } = req.query as MessageQuery;
			const user = await getUserById(
				(req.user as { id: number }).id,
				fastify
			);
			if (!user) {
				return res.status(400).send({ error: 'Unknown User' });
			}
			let newChatId: number;
			if (chat_id > user.id) newChatId = user.id;
			else newChatId = chat_id;
			const messages = await checkChatId(
				newChatId,
				[user.id, chat_id],
				fastify
			);
			if (typeof messages === 'string')
				return res.status(400).send({ error: messages });
			res.send(messages);
		}
	);
};

async function checkChatId(
	chat_id: number,
	user_ids: number[],
	fastify: FastifyInstance
): Promise<Msg[] | string> {
	const chat = (await fastify.sqlite.get(
		'SELECT id, name, is_group, created_at FROM chats WHERE id = ?',
		[chat_id]
	)) as Chat | null;
	if (!chat) {
		fastify.sqlite.run('INSERT INTO chats (id, is_group) VALUES (?, ?)', [
			chat_id,
			false,
		]);
		for (const user of user_ids) {
			fastify.sqlite.run(
				'INSERT INTO chat_partisipants (chat_id, user_id) VALUES (?, ?)',
				[chat_id, user]
			);
		}
		return ''; // TODO Error msg
	}
	return await checkUserAccess(chat, user_ids, fastify);
}

async function checkUserAccess(
	chat: Chat,
	user_ids: number[],
	fastify: FastifyInstance
): Promise<Msg[] | string> {
	const partisipants = (await fastify.sqlite.all(
		'SELECT id, chat_id, user_id FROM chat_partisipants WHERE chat_id = ?',
		[chat.id]
	)) as Part[];
	if (!partisipants || partisipants.length === 0)
		return 'User have no Access'; // TODO Error msg
	const check: boolean = user_ids.every((id) =>
		partisipants.some((p) => p.user_id === id)
	);
	if (!check) return 'User have no Access'; // TODO Error msg
	const messages = (await fastify.sqlite.all(
		'SELECT id, chat_id, user_id, content, created_at FROM messages WHERE chat_id = ?',
		[chat.id]
	)) as Msg[];
	if (!messages) return 'No Msg found'; // TODO Error msg
	return messages;
}

export default chat;
