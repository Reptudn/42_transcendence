import { FastifyPluginAsync } from 'fastify';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/', async (req: any, reply: any) => {
		// const isAuthenticated = (await checkAuth(req, false, fastify)) != null;
		// return reply.view(
		// 	'index.ejs',
		// 	{ name: 'Jonas', isAuthenticated },
		// 	{ layout: 'layouts/basic.ejs' }
		// );
		return reply.redirect(302, '/en');
	});
};

export default root;
