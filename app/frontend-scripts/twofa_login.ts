import { showLocalError, showLocalInfo } from './alert.js';
import { loadPartialView, updateMenu } from './script.js';

const totpInput = document.getElementById('totp') as HTMLInputElement;
const backup_totpinput = document.getElementById('backup-totp') as HTMLInputElement;

async function twofa_login() {
	try {
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
				rescue_token: backup_totp
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

async function twofa_login_google() {
	try {
		const fa_token = totpInput.value;
		const backup_totp = backup_totpinput.value;
		const response = await fetch('/api/auth/2fa_google', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				userid: window.user_id,
				fa_token: fa_token,
				rescue_token: backup_totp
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

// export function initTwofaLogin() {
//     const login2faButton = document.getElementById('login2faButton');
//     if (login2faButton) {
//         console.log('login2faButton found');
//         login2faButton.addEventListener('click', twofa_login, {
//             signal: window.abortController?.signal,
//         });
//     } else {
//         console.error('login2faButton not found');
//     }
// }

declare global {
	interface Window {
		user_id: number;
		twofa_login: () => Promise<void>;
		twofa_login_google: () => Promise<void>;
	}
}

window.twofa_login = twofa_login;
window.twofa_login_google = twofa_login_google;