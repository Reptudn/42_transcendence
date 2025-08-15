import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { checkAuth } from '../services/auth/auth';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get(
		'/',
		{ schema: { response: { 200: { type: 'string' } } } },
		async (req: any, reply: any) => {
			const isAuthenticated = (await checkAuth(req, false, fastify)) != null;
			return reply.view(
				'index.ejs',
				{ name: 'Jonas', isAuthenticated, t: req.t },
				{ layout: 'layouts/basic.ejs' }
			);
		}
	);

	fastify.get('/api/health', async (req, reply) => {
		return reply.send({ status: 'ok' });
	});

	fastify.setNotFoundHandler((request, reply) => {
		if (request.headers.accept?.includes('application/json'))
			return reply.status(404).send({ error: 'Not found 😢' });
		return reply.redirect('/partial/pages/error');
	});

	let theNumber = 42;
	fastify.post(
		'/number',
		async (
			req: FastifyRequest<{ Body: { number: number } }>,
			reply: FastifyReply
		) => {
			const { number } = req.body;
			if (typeof number !== 'number') {
				return reply.status(400).send({ error: 'Invalid number' });
			}
			theNumber += number;
			return reply.send({ number: theNumber });
		}
	);
};

export default root;
