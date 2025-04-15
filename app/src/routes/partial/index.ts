import { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../../services/auth/auth';

const partial: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/menu', async (req: any, reply: any) => {
		const isAuthenticated = (await checkAuth(req, false, fastify)) != null;
		const menuTemplate = isAuthenticated
			? 'partial/menu/loggedin.ejs'
			: 'partial/menu/guest.ejs';
		return reply.view(menuTemplate, { name: 'Freddy' });
	});
};

export default partial;
