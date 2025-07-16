import { loadPartialView } from './script.js';
import { showLocalError, showLocalInfo } from './alert.js';

export async function enable2fa() {
	try {
		const res = await fetch('/api/auth/totp/enable', {
			method: 'POST',
			// headers: {
			// 		'Content-Type': 'application/json',
			// },
		});

		if (res.ok) {
			const qr = document.getElementById('2fa-qr');
			const data = (await res.json()) as {
				qrcode: string;
				rescue: string;
			};
			if (qr) {
				(qr as HTMLImageElement).src = data.qrcode;
				(qr as HTMLImageElement).alt = '2FA QR Code';
			}
		} else {
			loadPartialView('edit_profile');
			const data = await res.json();
			showLocalError(`${data.message}`);
		}
	} catch (error) {
		showLocalError('Failed to enable 2fa!');
	}
}

export async function disable2fa() {
	try {
		const res = await fetch('/api/auth/totp/disable', {
			method: 'POST',
			// headers: {
			// 		'Content-Type': 'application/json',
			// },
		});
		if (res.ok) {
			const qr = document.getElementById('2fa-qr');
			if (qr) {
				qr.innerHTML = 'Disabled';
			}
			showLocalInfo('You have disabled 2fa successfully');
			loadPartialView('edit_profile');
		} else {
			const data = await res.json();
			showLocalError(`Error: ${data.message}`);
		}
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
