import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

interface User2FASetup {
  secret: string;
  rescue: string;
  qrcode: string;
}

export async function getUser2faSecret(user: User) : string
{
	const secret = await fastify.sqlite.run(`SELECT totp_secret FROM users WHERE id = ?`, [user.id])
	if (!secret) fastify.log.info(`No secret for ${user.username}`);
	return secret;
}

// returns the rescue code of the secret
export function createUser2faSecret(user: User) : Promise<User2FASetup>
{
	const secret = fastify.totp.generateSecret();
	const rescue = crypto.randomBytes(10).toString('hex');
	const qrcode = await fastify.totp.generateQRCode({ secret: secret.ascii });

	await fastify.sqlite.run(
		`UPDATE users SET totp_secret = ?, totp_rescue = ? WHERE id = ?`,
		[secret.ascii, rescue, user.id]
	);

	return {
		secret: secret.ascii,
		rescue,
		qrcode
	};
}

export async function removeUser2fa(user: User) {
	const [secret, rescue] = await fastify.sqlite.run('SELECT totp_secret, totp_rescue FROM users WHERE id = ?', [user.id]);
	if (!secret || !rescue) return;
	await fastify.sqlite.run('UPDATE users SET totp_secret = ?, totp_rescue = ? WHERE id = ?', ['', '', user.id])
}

export function verify2fa(user: User, code: string) : boolean
{
	return fastify.totp.verify({ secret: getUser2faSecret(user), code })
}