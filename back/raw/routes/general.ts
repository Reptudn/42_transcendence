import { FastifyInstance } from "fastify";
import { getUserById } from "../db/database.js";
import { checkAuth } from "./auth.js";

export async function generalRoutes(app: FastifyInstance) {
	app.get('/', async (req: any, reply: any) => {
		let isAuthenticated: boolean = false;
		try {
			await req.jwtVerify();
			isAuthenticated = true;
		}
		catch (error) {
			isAuthenticated = false;
		}
		return reply.view('partial/pages/index.ejs', { name: 'Jonas', isAuthenticated }, { layout: 'basic.ejs' });
	});

	app.get('/partial/pages/:page', async (req: any, reply: any) => {
		const page = req.params.page;
		const loadpartial = req.headers['loadpartial'] === 'true';
		const layoutOption = loadpartial ? false : 'basic.ejs';
		const isAuthenticated = await checkAuth(req);

		// generic pages without user-specific content
		if (page != 'profile' && page != 'edit_profile') {
			return reply.view(`partial/pages/${page}.ejs`, { name: 'Freddy', isAuthenticated }, { layout: layoutOption });
		}

		if (!isAuthenticated) {
			return reply
				.code(401)
				.view('partial/pages/no_access.ejs', { name: 'Freddy', isAuthenticated }, { layout: layoutOption });
		}

		const userId = Number(req.user.id);
		const user = await getUserById(userId);
		if (!user)
			return reply.code(404).view('error.ejs', { error_code: '404', isAuthenticated }, { layout: layoutOption });
		return reply.view('partial/pages/' + page + '.ejs', { user, 'isSelf': true, isAuthenticated }, { layout: layoutOption });
	});
	app.get('/partial/menu', async (req: any, reply: any) => {
		const isAuthenticated = await checkAuth(req);
		const menuTemplate = isAuthenticated ? 'partial/menu/loggedin.ejs' : 'partial/menu/guest.ejs';
		return reply.view(menuTemplate, { name: 'Freddy' });
	});
}