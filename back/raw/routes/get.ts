import { FastifyInstance } from "fastify";
import { getUserById } from "../db/db_users.js";
import { checkAuth } from "./api/auth.js";
import { searchUsers } from '../db/db_users.js';
import { getFriends } from '../db/db_friends.js';

export async function generalRoutes(app: FastifyInstance) {

	app.get('/', async (req: any, reply: any) => {
		const isAuthenticated = await checkAuth(req) != null;
		return reply.view('partial/pages/index.ejs', { name: 'Jonas', isAuthenticated }, { layout: 'basic.ejs' });
	});

	app.get('/partial/pages/:page/:profile_id?', async (req: any, reply: any) => {
		const page = req.params.page;
		const loadpartial = req.headers['loadpartial'] === 'true';
		const layoutOption = loadpartial ? false : 'basic.ejs';
		const user = await checkAuth(req);

		let variables: { [key: string]: any } = {};
		variables["isAuthenticated"] = user != null;
		if (user != null)
			variables["name"] = user.displayname || user.username;

		try {
			if (page === 'profile') {
				checkAuth(req, true);
				let self_id: number | null = user ? user.id : null;
				let friend_id: number | null = req.params.profile_id ? parseInt(req.params.profile_id) : null;
				if (friend_id == null && self_id == null)
					throw new Error("No user id provided");
				let profileId: number = friend_id ?? self_id!;
				let isSelf = profileId === req.user.id;
				let profile = await getUserById(profileId);
				if (!profile)
					throw new Error("User not found");
				profile.profile_picture = "/profile/" + profileId + "/picture";
				let friends = await getFriends(profileId);
				variables["user"] = profile;
				variables["isSelf"] = isSelf;
				variables["friends"] = friends;
			} else if (page === 'edit_profile') {
				let profile = await checkAuth(req, true);
				if (!profile)
					throw new Error("User not found");
				variables["user"] = profile;
			}
		} catch (err) {
			return reply.code(401).view('partial/pages/no_access.ejs', variables, { layout: layoutOption });
		}

		return reply.view(`partial/pages/${page}.ejs`, variables, { layout: layoutOption });
	});

	app.get('/partial/menu', async (req: any, reply: any) => {
		const isAuthenticated = await checkAuth(req) != null;
		const menuTemplate = isAuthenticated ? 'partial/menu/loggedin.ejs' : 'partial/menu/guest.ejs';
		return reply.view(menuTemplate, { name: 'Freddy' });
	});

	// TODO: also exclude people who a friend request was already sent to
	// TODO: improve friends fetching using more advanced SQL queries instead of filtering in JS
	app.get('/partial/friends/search', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
		const query: string = req.query.q || '';
		let results = query ? await searchUsers(query) : [];
		results.filter((user: any) => user.id !== req.user.id);
		results = results.slice(0, 25);

		const friends = await getFriends(req.user.id);
		results.forEach((result) => {
			if (friends.some((friend) => friend.id === result.id))
				results.splice(results.indexOf(result), 1);
		})

		return reply.view('partial/misc/friend_cards.ejs', { results });
	});
}