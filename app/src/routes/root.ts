import { FastifyPluginAsync } from 'fastify';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/', async (request, reply) => {
		const langHeader = request.headers['accept-language'] || '';
		const lang = langHeader.includes('de') ? 'de' : 'en';
		
		return reply.redirect(`/${lang}`);
	});

	fastify.all('/*', async (request, reply) => {
		return reply.redirect('/');
	});
};

export default root;
