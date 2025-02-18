import { app } from '../../../main.js';
app.get('/users/:name/profile', async (req, reply) => {
    const { name } = req.params;
    reply.send(`Profile for user: ${name}`);
});
