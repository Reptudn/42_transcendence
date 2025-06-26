import { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../services/auth/auth';
import { error } from 'console';

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

	fastify.setNotFoundHandler(async (req, reply) => {
		const isAuthenticated = (await checkAuth(req, false, fastify)) != null;
		return reply.code(404).view(
			'error.ejs',
			{
				err_code: 404,
				err_message: 'Page not found',
				isAuthenticated,
				t: req.t,
			},
			{ layout: 'layouts/basic.ejs' }
		);
	});
};

export default root;
