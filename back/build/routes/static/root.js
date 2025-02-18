import { app } from '../../main.js';
app.get('/', async (req, reply) => {
    return reply.viewAsync('pages/index.ejs', { name: 'Jonas' }, {
        layout: 'layouts/basic.ejs'
    });
});
