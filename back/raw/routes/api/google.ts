export interface GoogleUserInfo {
	id: string;
	email: string;
	verified_email: boolean;
	name: string;
	given_name: string;
	family_name: string;
	picture: string;
}

export async function getGoogleProfile(
	accessToken: string,
): Promise<GoogleUserInfo> {
	const response = await fetch(
	"https://www.googleapis.com/oauth2/v2/userinfo",
	{
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	},
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch Google profile: ${response.statusText}`);
	}

	const data = await response.json();
	return data as GoogleUserInfo;
}