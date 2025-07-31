interface GoogleUserInfo {
	id: string;
	email: string;
	verified_email: boolean;
	name: string;
	given_name: string;
	family_name: string;
	picture: string;
}

interface User2FASetup {
  secret: string;
  rescue: string;
  qrcode: string;
}