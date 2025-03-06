import fp from 'fastify-plugin';
import fastifyView from '@fastify/view';
import ejs from 'ejs';
import path from 'path';

export default fp(async (fastify, opts) => {
  	fastify.register(fastifyView, {
		engine: {
			ejs
		},
		root: path.join(__dirname, '../view'),
		options: {
			context: {
				get: (obj: any, prop: any) => obj && obj[prop]
			}
		},
		viewExt: 'ejs'
	});
});
