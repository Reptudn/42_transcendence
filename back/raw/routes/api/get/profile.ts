import { app } from '../../../main.js';
app.get('/users/:name/profile', async (req: any, reply: any) => {
	const { name } = req.params;
	reply.send(`Profile for user: ${name}`);
});