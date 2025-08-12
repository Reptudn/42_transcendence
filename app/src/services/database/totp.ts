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
		return '';
	}
	return row.totp_secret.toString();
}

export async function getUser2faRescue(user: User, fastify: FastifyInstance): Promise<string> {
	const row = await fastify.sqlite.get(
		'SELECT totp_rescue FROM users WHERE id = ?',
		[user.id]
	);

	if (!row || !row.totp_rescue) {
		return '';
	}
	return row.totp_rescue.toString();
}

// returns the rescue code of the secret
export async function createUser2faSecret(
	user: User,
	fastify: FastifyInstance
): Promise<User2FASetup> {
	const secret = fastify.totp.generateSecret();
	const rescue = crypto.randomBytes(10).toString(`hex`).substring(0, 10).toUpperCase();
	const qrcode = await fastify.totp.generateQRCode({
		secret: secret.ascii || secret, // use .ascii if available, else just secret
		issuer: 'Transcendence',
		label: user.username
	});

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
	const secret = await getUser2faSecret(user, fastify);
	if (!secret) {
		fastify.log.info('Error in verify');
		return false;
	}
	return totp.generate(secret) === code;
}
