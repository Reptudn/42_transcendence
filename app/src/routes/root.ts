import { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../services/auth/auth';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get(
		'/',
		{ schema: { response: { 200: { type: 'string' } } } },
		async (req: any, reply: any) => {
			const isAuthenticated =
				(await checkAuth(req, false, fastify)) != null;
			return reply.view(
				'index.ejs',
				{ name: 'Jonas', isAuthenticated, t: req.t },
				{ layout: 'layouts/basic.ejs' }
			);
		}
	);
};

export default root;
