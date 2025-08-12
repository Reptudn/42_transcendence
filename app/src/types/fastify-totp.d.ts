declare module 'fastify-totp' {
	import { FastifyPluginCallback } from 'fastify';
	const fastifyTotp: FastifyPluginCallback;
	export = fastifyTotp;
}
