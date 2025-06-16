import { FastifyPluginAsync } from 'fastify';

const totp: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post('/enable', { preValidation: [fastify.authenticate], }, async (request, reply) => {
		// enable 2fa for a user if not acivated aleady
		const user = await checkAuth(request, false, fastify);
		if (!user) return reply.code(401).send({ error: 'Unauthorized' });

		const secret = await getUser2faSecret(user);
		if (secret !== "") return reply.code(300).send({ error: '2fa already enabled!' });

		const totp: User2FASetup = setUser2faSecret(user);

		return reply.code(200).send{
			qrcode: totp.qrcode,
			rescue: totp.rescue
		}

	});
	fastify.post('/disable', { preValidation: [fastify.authenticate], }, async (request, reply) => {
		// disable 2fa for a user if not disabled already

		const user = await checkAuth(request, false, fastify);
		if (!user) return reply.code(401).send({ error: 'Unauthorized' });

		const secret = await getUser2faSecret(user);
		if (secret === "") return reply.code(300).send({ error: '2fa already disabled!' });

		await removeUser2fa(user);

		return reply.code(200).send({ message: '2fa disabled!' });
	});
	fastify.post('/rescue', { preValidation: [fastify.authenticate], schema: {
		body: {
			type: 'object',
			required: [ 'rescue_token' ],
			additionalProperties: false,
			properties: {
				rescue_token: { type: 'string', minLength: 10, maxLength: 10 }
			}
		}
	}}, async (request, reply) => {
		// use recovery code when 2fa has errors or stigg like that
	})
};

export default totp;
