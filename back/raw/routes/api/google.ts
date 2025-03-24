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
	accessToken: string
): Promise<GoogleUserInfo> {
	const response = await fetch(
		'https://www.googleapis.com/oauth2/v2/userinfo',
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		}
	);

	if (!response.ok) {
		throw new Error(
			`Failed to fetch Google profile: ${response.statusText}`
		);
	}

	const data = await response.json();
	return data as GoogleUserInfo;
}

import * as https from 'node:https';
export async function getImageFromLink(url: string): Promise<string> {
	// TODO: make this fnction better
	return new Promise((resolve, reject) => {
		https
			.get(url, (response) => {
				if (response.statusCode !== 200) {
					reject(
						new Error(
							`Failed to download image: ${response.statusCode}`
						)
					);
					return;
				}

				const contentType =
					response.headers['content-type'] || 'image/jpeg';
				const chunks: Buffer[] = [];

				response.on('data', (chunk) => chunks.push(chunk));
				response.on('end', () => {
					const buffer = Buffer.concat(chunks);
					const base64Image = buffer.toString('base64');
					resolve(`data:${contentType};base64,${base64Image}`);
				});
			})
			.on('error', reject);
	});
}
