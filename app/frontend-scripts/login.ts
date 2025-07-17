import { showLocalInfo, showLocalError } from './alert.js';
import './script.js';
import { updateMenu, loadPartialView } from './script.js';
import { initTwofaLogin } from './2fa_login.js';

const loginAction = async () => {
	const username = (document.querySelector('#username') as HTMLInputElement)
		.value;
	const password = (document.querySelector('#password') as HTMLInputElement)
		.value;

	try {
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ username, password /*totp*/ }),
		});

		if (response.ok) {
			const responseData = await response.json();
			if (responseData.twofa_status === true) {
				window.user_id = responseData.user_id as number;
				await loadPartialView('2fa_code');
				console.log('after login in 2facode');
				initTwofaLogin();
				console.log('buttin initialized');
				return;
			}
			updateMenu();
			await loadPartialView('profile');
			showLocalInfo('You have logged in successfully');
		} else {
			const data = await response.json();
			showLocalError(`Error: ${data.message}`);
		}
	} catch (error) {
		console.error('Error:', error);
		showLocalError('An error occurred. Please try again.');
	}
};

const loginButton = document.getElementById('loginButton');
if (loginButton) {
	console.log('loginButton found');
	loginButton.addEventListener('click', loginAction, {
		signal: window.abortController?.signal,
	});
} else {
	console.error('loginButton not found');
}

declare global {
	interface window {
		user_id: number;
	}
}