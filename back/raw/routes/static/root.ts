import { app } from '../../main';
app.get('/', async (req: any, reply: any) => {
	return reply.viewAsync('pages/index.ejs', { name: 'Jonas' }, {
		layout: 'layouts/basic.ejs'
	});
});