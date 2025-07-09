import type { FastifyPluginAsync } from 'fastify';
import { checkAuth } from '../../../../services/auth/auth';
import {
	getUser2faSecret,
	createUser2faSecret,
	removeUser2fa,
} from '../../../../services/database/totp';
import { sendPopupToClient } from '../../../../services/sse/popup';

const totp: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post(
		'/enable',
		{ preValidation: [fastify.authenticate] },
		async (request, reply) => {
			fastify.log.info("Jonas suckt");
			// enable 2fa for a user if not acivated aleady
			const user = await checkAuth(request, false, fastify);
			if (!user) return reply.code(401).send({ error: 'Unauthorized' });
			fastify.log.info("Jonas bob tshierillo");
			const secret = await getUser2faSecret(user, fastify);
			fastify.log.info("Secret: ", secret);
			if (secret !== ''){
				fastify.log.info("Im secret chcek");
				return reply.code(300).send({ error: '2fa already enabled!' });
			}

			const totp: User2FASetup = await createUser2faSecret(user, fastify);
			fastify.log.info("Jonas schlecht in battlefield 1");
			sendPopupToClient(user.id, 'Your 2fa QR Code', `<img src="${totp.qrcode}"></img>`);
			fastify.log.info("Jonas schlecht in battlefield 5");
			sendPopupToClient(user.id, 'Your Rescue code (write this one down somewhere)', totp.rescue)
			fastify.log.info("Jonas schlecht in battlefield 2042");
			return reply.code(200).send({
				qrcode: totp.qrcode,
				rescue: totp.rescue,
			});
		}
	);
	fastify.post(
		'/disable',
		{ preValidation: [fastify.authenticate] },
		async (request, reply) => {
			// disable 2fa for a user if not disabled already

			const user = await checkAuth(request, false, fastify);
			if (!user) return reply.code(401).send({ error: 'Unauthorized' });

			const secret = await getUser2faSecret(user, fastify);
			if (secret === '')
				return reply.code(300).send({ error: '2fa already disabled!' });

			await removeUser2fa(user, fastify);

			return reply.code(200).send({ message: '2fa disabled!' });
		}
	);
	fastify.post(
		'/rescue',
		{
			preValidation: [fastify.authenticate],
			schema: {
				body: {
					type: 'object',
					required: ['rescue_token'],
					additionalProperties: false,
					properties: {
						rescue_token: {
							type: 'string',
							minLength: 10,
							maxLength: 10,
						},
					},
				},
			},
		},
		async (request, reply) => {
			// use recovery code when 2fa has errors or stigg like that
		}
	);
};

export default totp;
