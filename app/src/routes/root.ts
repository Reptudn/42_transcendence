import { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../services/auth/auth';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/', async (req: any, reply: any) => {
		const isAuthenticated = (await checkAuth(req)) != null;
		return reply.view(
			'index.ejs',
			{ name: 'Jonas', isAuthenticated },
			{ layout: 'layouts/basic.ejs' }
		);
	});
};

export default root;
