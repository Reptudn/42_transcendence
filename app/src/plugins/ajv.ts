import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Ajv from 'ajv';
import ajvErrors from 'ajv-errors';

export default fp(async (fastify: FastifyInstance) => {
  const ajv = new Ajv({
    allErrors: true,
    strict: true,
  });

  ajvErrors(ajv);
  
  fastify.setValidatorCompiler(({ schema }: { schema: any }) => ajv.compile(schema));
});

