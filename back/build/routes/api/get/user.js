import { app } from '../../../main.js';
app.get('/user', { preValidation: [app.authenticate] }, async (req, reply) => {
    reply.send('user');
});
