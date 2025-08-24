import { showLocalError, showLocalInfo } from './alert.js';
import { updateMenu, loadPartialView } from './navigator.js';
import { Script } from './script_manager.js';

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

			showLocalInfo(data.message || data.error, undefined, 5000);
			loadPartialView('profile');
		} else {
			const data = await response.json();
			showLocalError(data.error, undefined, 5000);
		}
	} catch (error) {
		console.error('Error:', error);
		showLocalError('An error occurred. Please try again.', undefined, 5000);
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
			showLocalInfo(data.message, undefined, 5000);
			loadPartialView('profile');
		} else {
			const data = await response.json();
			showLocalError(data.error, undefined, 5000);
		}
	} catch (error) {
		console.error('Error:', error);
		showLocalError('An error occurred. Please try again.', undefined, 5000);
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

async function load() {
	window.twofa_login = twofa_login;
	window.twofa_login_google = twofa_login_google;
}

async function unload() {
	delete (window as any).twofa_login;
	delete (window as any).twofa_login_google;
}

const twofa_login_script = new Script(load, unload);
export default twofa_login_script;
