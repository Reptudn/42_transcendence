import fastify from 'fastify';

const server = fastify();

server.get('/', async (request, reply) => {
  return { hello: 'world' };
});

server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }
  console.log(`Server is now listening on ${address}`);
});
