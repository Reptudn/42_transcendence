import { showLocalError, showLocalInfo } from './alert.js';
import { updateMenu, loadPartialView } from './navigator.js';

async function twofa_login() {
	try {
		const totpInput = document.getElementById('totp') as HTMLInputElement;
		const backup_totpinput = document.getElementById(
			'backup-totp'
		) as HTMLInputElement;
		const fa_token = totpInput.value;
		const backup_totp = backup_totpinput.value;
		const response = await fetch('/api/auth/2fa', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				userid: window.user_id,
				fa_token: fa_token,
				rescue_token: backup_totp,
			}),
		});

		if (response.ok) {
			updateMenu();
			const data = await response.json();

			showLocalInfo(data.message || data.error);
			loadPartialView('profile');
		} else {
			const data = await response.json();
			showLocalError(data.error);
		}
	} catch (error) {
		console.error('Error:', error);
		showLocalError('An error occurred. Please try again.');
	}
}

async function twofa_login_google() {
	try {
		const totpInput = document.getElementById('totp_google') as HTMLInputElement;
		const backup_totpinput = document.getElementById(
			'backup-totp_google'
		) as HTMLInputElement;
		const urlParams = new URLSearchParams(window.location.search);
		const userId = urlParams.get('userid');
		const fa_token = totpInput.value;
		const backup_totp = backup_totpinput.value;
		const response = await fetch('/api/auth/2fa_google', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				userid: userId,
				fa_token: fa_token,
				rescue_token: backup_totp,
			}),
		});

		if (response.ok) {
			updateMenu();
			const data = await response.json();
			showLocalInfo(data.message);
			loadPartialView('profile');
		} else {
			const data = await response.json();
			showLocalError(data.error);
		}
	} catch (error) {
		console.error('Error:', error);
		showLocalError('An error occurred. Please try again.');
	}
}

declare global {
	interface Window {
		twofa_login: () => Promise<void>;
		twofa_login_google: () => Promise<void>;
		user_id: number;
	}
}

window.twofa_login = twofa_login;
window.twofa_login_google = twofa_login_google;
