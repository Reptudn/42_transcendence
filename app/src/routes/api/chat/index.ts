import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { checkAuth } from '../../../services/auth/auth';
import {
	connectedClients,
	sendSseMessage,
} from '../../../services/sse/handler';

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post('/', async (req: FastifyRequest, res: FastifyReply) => {
		const body = req.body as {
			chat?: string;
			is_group?: boolean;
			message?: string;
		};
		const user = await checkAuth(req, false, fastify);

		if (!user) {
			return res.status(400).send({ error: 'Unknown User' });
		}

		let group = await fastify.sqlite.get(
			'SELECT id, name, is_group FROM chats WHERE name = ?',
			[body.chat]
		);

		if (!group) {
			await fastify.sqlite.run(
				'INSERT INTO chats (name, is_group) VALUES (?, ?)',
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
				JSON.stringify({ user: user.username, message: body.message })
			);
		}
		res.send({ ok: true });
	});

	fastify.get('/users', async (req: FastifyRequest, res: FastifyReply) => {
		const users = await fastify.sqlite.all('SELECT username FROM users');
		res.send(users);
	});

	fastify.get('/messages', async (req: FastifyRequest, res: FastifyReply) => {
		// const messages = await fastify.sqlite.all(
		// 	'SELECT user_id, content FROM messages'
		// );
		const messages = await fastify.sqlite.all(`
			SELECT users.username AS user, messages.content AS message
			FROM messages
			JOIN users ON messages.user_id = users.id
			ORDER BY messages.created_at ASC
		`);
		res.send(messages);
	});
};

export default chat;
