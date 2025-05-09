import { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../../services/auth/auth';
import lang_de from '../../../locales/de.json';
import lang_en from '../../../locales/en.json';
import lang_fr from '../../../locales/fr.json';

export const languages: Map<string, Record<string, string>> = new Map();

languages.set('en', lang_en);
languages.set('de', lang_de);
languages.set('fr', lang_fr);

export const getLanguages = (): Map<string, Record<string, string>> => languages;

const lang: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

	fastify.get("/:lang", async (req: any, reply: any) => {
		let lang = req.params.lang;
		let langSet = languages.get(lang);
		const isAuthenticated = (await checkAuth(req, false, fastify)) != null;
		if (langSet === undefined) {
			fastify.log.info("redirecting to en route");
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
