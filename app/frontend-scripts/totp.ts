import { loadPartialView } from './script.js';
import { showLocalError, showLocalInfo } from './alert.js';

export async function enable2fa() {
	console.log('Start');
	try {
		const res = await fetch('/api/auth/totp/enable', {
			method: 'POST',
			// headers: {
			// 		'Content-Type': 'application/json',
			// },
		});

		// console.log('response: ', res.error);
		console.log('response: ', res.status);

		if (res.ok) {
			console.log('res.ok');
			const qr = document.getElementById('2fa-qr');
			// alert('qr selected');
			const data = await res.json();
			if (qr) {
				(qr as HTMLImageElement).src = data.qrcode;
				(qr as HTMLImageElement).alt = '2FA QR Code';
				// (qr as HTMLImageElement).
				// showLocalInfo(qr as HTMLImageElement);
			}
			// const enable_button = document.getElementById('2fa-enabled');
			// (enable_button as HTMLButtonElement).innerText = '2fa enabled';
		} else {
			console.log('else');
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
		console.error('Error:', error);
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
