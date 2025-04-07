import { getUserById } from '../database/db_users';

export async function checkAuth(
	request: any,
	throwErr: boolean = false
): Promise<User | null> {
	try {
		await request.jwtVerify(); // INFO: if this throws an exception its probably because the old token is still in the browser and the new jwt secret is now different
		return getUserById(request.user.id);
	} catch (error) {
		if (throwErr) {
			console.log('Error', error);
		}
		return null;
	}
}
