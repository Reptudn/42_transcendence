import { FastifyInstance } from "fastify";
import { getUserById } from "../db/database.js";
import { checkAuth } from "./auth.js";

export async function staticRoutes(app: FastifyInstance)
{
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
    
    app.get('/profile/edit', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
        const userId = req.user.id;
        const user = await getUserById(userId);
        if (!user) return reply.code(404).view('error.ejs', { error_code: '404' }, { layout: 'basic.ejs' });
        reply.view('partial/pages/edit_profile.ejs', { user });
    });
    app.get('/profile/:id', async (req: any, reply: any) => {
        const { id } = req.params;
        let isSelf;
        try {
            await req.jwtVerify();
            isSelf = req.user && req.user.id === parseInt(id);
        } catch (err) {
            isSelf = false;
        }
        let user = await getUserById(parseInt(id));
        if (!user)
            return reply.code(404).view('error.ejs', { error_code: '404' }, { layout: 'basic.ejs' });
        user.profile_picture = "/profile/" + id + "/picture";
        return reply.view('partial/pages/profile.ejs', { user, isSelf });
    });
    app.get('/profile/:id/picture', async (req: any, reply: any) => {
        const { id } = req.params;
        const user = await getUserById(parseInt(id));
        if (!user) {
            return reply.code(404).view('error.ejs', { error_code: '404' }, { layout: 'basic.ejs' });
        }
        if (!user.profile_picture) {
            return reply.redirect('/static/assets/images/default_profile.png');
        }
        let base64Data = user.profile_picture;
        const dataPrefix = 'data:image/png;base64,';
        if (base64Data.startsWith(dataPrefix)) {
            base64Data = base64Data.replace(dataPrefix, '');
        }
        reply.header('Content-Type', 'image/png').send(Buffer.from(base64Data, 'base64'));
    });
    app.get('/menu', async (req: any, reply: any) => {
        const isAuthenticated = await checkAuth(req);
        const menuTemplate = isAuthenticated ? 'partial/menu/loggedin.ejs' : 'partial/menu/guest.ejs';
        return reply.view(menuTemplate, { name: 'Freddy' });
    });
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
}