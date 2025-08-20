import { showLocalError, showLocalInfo } from './alert.js';
import { notifyEventSource } from './events.js';
import { loadPartialView } from './navigator.js';

export async function enable2fa() {
	if (!notifyEventSource || notifyEventSource.readyState !== EventSource.OPEN) {
		showLocalInfo(
			'You cant enable 2fa when you are not connected with SSE',
			undefined,
			5000
		);
		return;
	}

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
			showLocalError(data.error, undefined, 5000);
		}
		loadPartialView('edit_profile');
	} catch (error) {
		showLocalError('Failed to enable 2fa!', undefined, 5000);
	}
}

export async function disable2fa() {
	try {
		const res = await fetch('/api/auth/totp/disable', {
			method: 'POST',
		});
		if (res.ok) {
			showLocalInfo('You have disabled 2fa successfully', undefined, 5000);
		} else {
			const data = await res.json();
			showLocalError(data.error, undefined, 5000);
		}
		loadPartialView('edit_profile');
	} catch (error) {
		window.showLocalError('Failed to disable 2fa!', undefined, 5000);
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
