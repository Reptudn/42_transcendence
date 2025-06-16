export async function enable2fa()
{
	try {
		const res = await fetch('/api/auth/totp/enable', {
			method: 'POST',
			headers: {
					'Content-Type': 'application/json',
			},
		});

		if (response.ok) {
			const qr = (document.querySelector('#2fa-qr') as HTMLImageElement).value;
			const data = res.json();
			qr.src = data.qrcode;
			qr.innerHtml = data.qrcode;
			showLocalInfo('You have enabled 2fa successfully');
		} else {
			const data = await response.json();
			showLocalError(`Error: ${data.message}`);
		}

	} catch (error) {
		console.error('Error:', error);
		showLocalError('Failed to enable 2fa!');
	}
}

export async function disbale2fa()
{
	try{
		const res = await fetch('/api/auth/totp/disable', {
			method: 'POST',
			headers: {
					'Content-Type': 'application/json',
			},
		});
	} catch (error) {
		console.error('Error:', error);
		showLocalError('Failed to disable 2fa!');
	}
}

declare global {
	interface Window {
		enable2fa: () => Promise<void>;
		disable2fa: () => Promise<void>;
	}
}

window.disbale2fa = disbale2fa;
window.enable2fa = enable2fa;