import { app } from '../../../main.js';
app.get('/user', { preValidation: [app.authenticate] }, async (req: any, reply: any) => {
	reply.send('user');
});