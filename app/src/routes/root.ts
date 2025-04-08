import { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../services/auth/auth';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/', async (req: any, reply: any) => {
		const isAuthenticated = (await checkAuth(req)) != null;
		return reply.view(
			'partial/pages/index.ejs',
			{ name: 'Jonas', isAuthenticated },
			{ layout: 'basic.ejs' }
		);
	});
};

export default root;
