import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
	interface FastifyInstance {
		authenticate(
			request: FastifyRequest,
			reply: FastifyReply
		): Promise<void>;
		config: {
			GOOGLE_OAUTH_CLIENT_ID: string;
			GOOGLE_OAUTH_CLIENT_SECRET: string;
			JWT_SECRET: string;
			HOST_URI: string;
		};
		googleOAuth2: OAuth2Namespace;
	}
}
