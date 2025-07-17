import { showLocalError, showLocalInfo } from './alert';
import { loadPartialView, updateMenu } from './script';

declare global {
	interface Window {
		user_id: number;
	}
}

const totpInput = document.getElementById('totp') as HTMLInputElement;

export const twofa_login = async () =>{
	try {
		const fa_token = totpInput.value;
		const response = await fetch('/api/auth/2fa', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				userid: window.user_id,
				fa_token: fa_token,
			}),
		});

		if (response.ok) {
			updateMenu();
			loadPartialView('profile');
			showLocalInfo('You have logged in successfully');
		} else {
			const data = await response.json();
			showLocalError(`Error: ${data.message}`);
		}
	} catch (error) {
		console.error('Error:', error);
		showLocalError('An error occurred. Please try again.');
	}
}

export function initTwofaLogin() {
    const login2faButton = document.getElementById('login2faButton');
    if (login2faButton) {
        console.log('login2faButton found');
        login2faButton.addEventListener('click', twofa_login, {
            signal: window.abortController?.signal,
        });
    } else {
        console.error('login2faButton not found');
    }
}

declare global {
	interface Window {
		user_id: number;
	}
}