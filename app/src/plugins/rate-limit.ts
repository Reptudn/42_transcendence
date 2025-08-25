import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

export default fp(async (fastify) => {
	fastify.register(rateLimit, {
		max: 200,
		timeWindow: '1 minute',
		keyGenerator: (req) => {
			return req.cookies.token || req.ip;
		},
		errorResponseBuilder: (req, context) => {
			return {
				error: `Rate limit exceeded... Please wait ${Math.round(
					context.ttl / 1000
				)} seconds before trying again.`,
				message: `Please wait ${Math.round(
					context.ttl / 1000
				)} seconds before trying again.`,
				statusCode: 429,
			};
		},
	});
});

export const createRateLimit = (
	max: number,
	timeWindow: string,
	customMessage?: string
) => ({
	max,
	timeWindow,
	errorResponseBuilder: (req: any, context: any) => ({
		error:
			customMessage +
				`... Please wait ${Math.round(
					context.ttl / 1000
				)} seconds before trying again.` ||
			`Please wait ${Math.round(
				context.ttl / 1000
			)} seconds before trying again.`,
		message:
			customMessage +
				`... Please wait ${Math.round(
					context.ttl / 1000
				)} seconds before trying again.` ||
			`Rate limit exceeded... Please wait ${Math.round(
				context.ttl / 1000
			)} seconds before trying again.`,
		statusCode: 429,
	}),
});
