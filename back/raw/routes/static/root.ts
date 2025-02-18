import { app } from '../../main.js';
app.get('/', async (req: any, reply: any) => {
	return reply.viewAsync('pages/index.ejs', { name: 'Jonas' }, {
		layout: 'layouts/basic.ejs'
	});
});