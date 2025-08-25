import { join } from 'node:path';
import AutoLoad, { type AutoloadPluginOptions } from '@fastify/autoload';
import type { FastifyPluginAsync, FastifyServerOptions } from 'fastify';
import fastifyEnv from '@fastify/env';
import i18next from './middleware/localization';
import middleware from 'i18next-http-middleware';

const envSchema = {
	type: 'object',
	required: [
		'GOOGLE_OAUTH_CLIENT_ID',
		'GOOGLE_OAUTH_CLIENT_SECRET',
		'JWT_SECRET',
		'HOST_URI',
	],
	properties: {
		GOOGLE_OAUTH_CLIENT_ID: { type: 'string' },
		GOOGLE_OAUTH_CLIENT_SECRET: { type: 'string' },
		JWT_SECRET: { type: 'string' },
		HOST_URI: { type: 'string' },
	},
};

export interface AppOptions
	extends FastifyServerOptions,
		Partial<AutoloadPluginOptions> {}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = { trustProxy: process.env.NODE_ENV === 'production' ? 1 : true  };

const app: FastifyPluginAsync<AppOptions> = async (
	fastify,
	opts
): Promise<void> => {
	// Place here your custom code!
	fastify.register(fastifyEnv, { schema: envSchema }).ready((err) => {
		if (err) {
			console.error(err);
			fastify.close().then(() => process.exit(1));
		}
	});

	fastify.log.info('Registering i18next');
	fastify.register(middleware.plugin, { i18next });
	fastify.log.info('Registered i18next');

	// Do not touch the following lines

	// This loads all plugins defined in plugins
	// those should be support plugins that are reused
	// through your application
	// eslint-disable-next-line no-void
	void fastify.register(AutoLoad, {
		dir: join(__dirname, 'plugins'),
		options: opts,
		autoHooks: true,
		overwriteHooks: true,
	});

	// This loads all plugins defined in routes
	// define your routes in one of these
	// eslint-disable-next-line no-void
	void fastify.register(AutoLoad, {
		dir: join(__dirname, 'routes'),
		options: opts,
		autoHooks: true,
		overwriteHooks: true,
	});
};

export default app;
export { app, options };
