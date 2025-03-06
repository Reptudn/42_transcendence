import fastifyCookie from '@fastify/cookie';
import fp from 'fastify-plugin'

export default fp(async (fastify, opts) => {
  fastify.register(fastifyCookie);
});

// When using .decorate you have to specify added properties for Typescript
declare module 'fastify' {
  export interface FastifyInstance {
	someSupport(): string;
  }
}
