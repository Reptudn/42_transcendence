import { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { checkAuth } from '../../../services/auth/auth';

const chat: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/', async (req: FastifyRequest, res: FastifyReply) => {
		req;
		console.log('get');
		res.raw.write('data: Hallo\n\n');
	});

	fastify.post('/', async (req: FastifyRequest, res: FastifyReply) => {
		const body = req.body as {
			chat?: string;
			is_group?: string;
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
		res.send({ ok: true });
	});
};

export default chat;
