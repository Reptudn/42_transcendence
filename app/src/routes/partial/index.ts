import { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../../services/auth/auth';

const partial: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get(
		'/menu',
		{ schema: { response: { 200: { type: 'string' } } } },
		async (req: any, reply: any) => {
			const isAuthenticated =
				(await checkAuth(req, false, fastify)) != null;
			const menuTemplate = isAuthenticated
				? 'layouts/menu/loggedin.ejs'
				: 'layouts/menu/guest.ejs';
			return reply.view(menuTemplate, { name: 'Freddy', t: req.t });
		}
	);
};

export default partial;
