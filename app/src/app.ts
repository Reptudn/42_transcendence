import { join } from 'node:path';
import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload';
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify';
import fastifyEnv from '@fastify/env';

const envSchema = {
	type: 'object',
	required: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET'],
	properties: {
		GOOGLE_OAUTH_CLIENT_ID: { type: 'string' },
		GOOGLE_OAUTH_CLIENT_SECRET: { type: 'string' },
	},
};

export interface AppOptions
	extends FastifyServerOptions,
		Partial<AutoloadPluginOptions> {}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {};

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
