import { showLocalError, showLocalInfo } from './alert.js';
import { loadPartialView } from './navigator.js';

export async function enable2fa() {
	try {
		const res = await fetch('/api/auth/totp/enable', {
			method: 'POST',
		});

		if (res.ok) {
			// const data = (await res.json()) as {
			// 	qrcode: string;
			// 	rescue: string;
			// };
		} else {
			const data = await res.json();
			showLocalError(data.error);
		}
		loadPartialView('edit_profile');
	} catch (error) {
		showLocalError('Failed to enable 2fa!');
	}
}

export async function disable2fa() {
	try {
		const res = await fetch('/api/auth/totp/disable', {
			method: 'POST',
		});
		if (res.ok) {
			showLocalInfo('You have disabled 2fa successfully');
		} else {
			const data = await res.json();
			showLocalError(data.error);
		}
		loadPartialView('edit_profile');
	} catch (error) {
		window.showLocalError('Failed to disable 2fa!');
	}
}

declare global {
	interface Window {
		enable2fa: () => Promise<void>;
		disable2fa: () => Promise<void>;
	}
}

window.disable2fa = disable2fa;
window.enable2fa = enable2fa;
