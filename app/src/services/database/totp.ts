import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';

export async function getUser2faSecret(
	user: User,
	fastify: FastifyInstance
): Promise<string> {
	const row = await fastify.sqlite.get(
		'SELECT totp_secret FROM users WHERE id = ?',
		[user.id]
	);

	if (!row || !row.totp_secret) {
		fastify.log.info(`No secret for ${user.username}`);
		return '';
		}

	fastify.log.info("Secret get: ", row.totp_secret);
	return row.totp_secret.toString();
}

// returns the rescue code of the secret
export async function createUser2faSecret(
	user: User,
	fastify: FastifyInstance
): Promise<User2FASetup> {
	const secret = fastify.totp.generateSecret();
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
	console.log("User: ", user);
	console.log("Code: ", code);
	const secret = await getUser2faSecret(user, fastify);
	if (!secret) {
		console.log("Error in verify");
		return false;
	}
	const verfied: boolean = fastify.totp.verify({ secret, code });
	console.log("totp verfify return: ", verfied);
	return verfied;
}
