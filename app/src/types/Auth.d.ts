interface GoogleUserInfo {
	id: string;
	email: string;
	verified_email: boolean;
	name: string;
	given_name: string;
	family_name: string;
	picture: string;
}

export async function checkAuth(
	request: any,
	throwErr: boolean = false
): Promise<User | null>;
