import fp from 'fastify-plugin'
import fastifyStatic from '@fastify/static';
import path from 'path';

export default fp(async (fastify) => {
  fastify.register(fastifyStatic, {
	root: path.resolve(__dirname, '../static'),
	prefix: '/static/',
  });
});
