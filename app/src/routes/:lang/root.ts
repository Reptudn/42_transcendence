import { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../../services/auth/auth';

const lang: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/', async (req: any, reply: any) => {
		const lang = req.params.lang;
		const isAuthenticated = (await checkAuth(req, false, fastify)) != null;
		return reply.view(
			'index.ejs',
			{ name: 'Jonas', isAuthenticated, lang: lang },
			{ layout: 'layouts/basic.ejs' }
		);
	});
};

export default lang;
