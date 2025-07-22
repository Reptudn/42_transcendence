import fp from 'fastify-plugin';
import fastifyView from '@fastify/view';
import ejs from 'ejs';
import path from 'node:path';

export default fp(async (fastify) => {
	fastify.register(fastifyView, {
		engine: {
			ejs,
		},
		root: path.join(__dirname, '../../pages/'),
		options: {
			context: {
				get: (obj: any, prop: any) => obj && obj[prop],
			},
		},
		viewExt: 'ejs',
	});
});
