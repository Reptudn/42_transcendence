import { app } from '../../main.js';
app.get('/partial/:page', async (req: any, reply: any) => {
	const page = req.params.page;
	const dataSample = { name: 'Jonas' }; // In a real-world case, fetch pertinent data here.
	return reply.view(`pages/${page}.ejs`, dataSample);
});