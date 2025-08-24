import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { checkAuth } from '../services/auth/auth';
import { incrementUserClickCount } from '../services/database/users';
import { unlockAchievement } from '../services/database/achievements';

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
			if (!Number.isFinite(number)) {
				return reply.status(400).send({ error: 'Invalid number' });
			}
			if (typeof number !== 'number') {
				return reply.status(400).send({ error: 'Invalid number' });
			}
			const isAuthenticated = await checkAuth(req, true, fastify);
			if (isAuthenticated) {
				const newCount = await incrementUserClickCount(
					isAuthenticated.id,
					number,
					fastify
				);
				if (newCount > 0) {
					await unlockAchievement(isAuthenticated.id, 'number-1', fastify);
				}
				if (newCount >= 100) {
					await unlockAchievement(isAuthenticated.id, 'number-2', fastify);
				}
				if (newCount >= 1000) {
					await unlockAchievement(isAuthenticated.id, 'number-3', fastify);
				}
			}
			theNumber += number;
			return reply.send({ number: theNumber });
		}
	);
};

export default root;
