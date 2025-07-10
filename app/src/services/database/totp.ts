import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { totp } from 'otplib';

export async function getUser2faSecret(
	user: User,
	fastify: FastifyInstance
): Promise<string> {
	const row = await fastify.sqlite.get(
		'SELECT totp_secret FROM users WHERE id = ?',
		[user.id]
	);

	if (!row || !row.totp_secret) {
		fastify.log.info(`No secret for ${JSON.stringify(user.username)}`);
		return '';
	}

	fastify.log.info(`Secret get: ${JSON.stringify(row.totp_secret)}`);
	return row.totp_secret.toString();
}

// returns the rescue code of the secret
export async function createUser2faSecret(
	user: User,
	fastify: FastifyInstance
): Promise<User2FASetup> {
	const secret = fastify.totp.generateSecret();
	fastify.log.info(`Secret fresh: ${secret}`);
	const rescue = crypto.randomBytes(10).toString('hex');
	const qrcode = await fastify.totp.generateQRCode({ secret: secret.ascii });

	await fastify.sqlite.run(
		'UPDATE users SET totp_secret = ?, totp_rescue = ? WHERE id = ?',
		[secret.ascii, rescue, user.id]
	);

	return {
		secret: secret.ascii,
		rescue,
		qrcode,
	};
}

export async function removeUser2fa(
	user: User,
	fastify: FastifyInstance
): Promise<void> {
	const result = await fastify.sqlite.get(
		'SELECT totp_secret, totp_rescue FROM users WHERE id = ?',
		[user.id]
	);
	if (!result || !result.totp_secret || !result.totp_rescue) return;
	await fastify.sqlite.run(
		'UPDATE users SET totp_secret = ?, totp_rescue = ? WHERE id = ?',
		['', '', user.id]
	);
}

export async function verify2fa(
	user: User,
	code: string,
	fastify: FastifyInstance
): Promise<boolean> {
	fastify.log.info(`User: ${user}`);
	const secret = await getUser2faSecret(user, fastify);
	if (!secret) {
		fastify.log.info('Error in verify');
		return false;
	}
	fastify.log.info(`Secret: ${secret}`);
	fastify.log.info(`Code: ${code}`);
	fastify.log.info(`Genreated token: ${totp.generate(secret)}`);
	fastify.log.info(`Code: ${code}`);
	const verfied: boolean = fastify.totp.verify({ secret: secret, code });
	const ver: boolean = totp.generate(secret) === code;
	fastify.log.info(`totp verfify return: ${verfied}`);
	fastify.log.info(`totp ver return: ${ver}`);
	return ver;
}
