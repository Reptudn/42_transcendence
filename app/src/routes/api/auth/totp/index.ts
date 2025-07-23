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
			// enable 2fa for a user if not acivated aleady
			const user = await checkAuth(request, false, fastify);
			if (!user) return reply.code(401).send({ error: 'Unauthorized' });
			const secret = await getUser2faSecret(user, fastify);
			if (secret !== ''){
				return reply.code(300).send({ error: '2fa already enabled!' });
			}

			const totp: User2FASetup = await createUser2faSecret(user, fastify);
			sendPopupToClient(fastify, user.id, 'Your 2fa QR Code', `<img src="${totp.qrcode}"></img>`);
			sendPopupToClient(fastify, user.id, 'Your Rescue code (write this one down somewhere)', totp.rescue)
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
};

export default totp;
