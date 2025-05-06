import { FastifyInstance } from 'fastify';
import { getUserById } from '../database/users.js';

export async function checkAuth(
	request: any,
	throwErr: boolean = false,
	fastify: FastifyInstance
): Promise<User | null> {
	try {
		await request.jwtVerify(); // INFO: if this throws an exception its probably because the old token is still in the browser and the new jwt secret is now different
		return getUserById(request.user.id, fastify);
	} catch (error) {
		if (throwErr) {
			console.log('Error', error);
		}
		return null;
	}
}
