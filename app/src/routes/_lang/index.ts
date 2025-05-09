import { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../../services/auth/auth';
import { getLanguages } from '../../services/locale';

const lang: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/:lang', async (req: any, reply: any) => {
		let lang = req.params.lang;
		let langSet = getLanguages(lang);
		const isAuthenticated = (await checkAuth(req, false, fastify)) != null;
		if (langSet === undefined) {
			fastify.log.info('redirecting to en route');
			return reply.redirect('/en');
		}
		// return reply.send(lang)
		return reply.view(
			'index.ejs',
			{ name: 'Jonas', isAuthenticated, text: langSet },
			{ layout: 'layouts/basic.ejs' }
		);
	});
};

export default lang;
