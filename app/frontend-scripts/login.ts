import { showLocalInfo, showLocalError } from './alert.js';
import './script.js';
import { updateMenu, loadPartialView } from './script.js';

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
			body: JSON.stringify({ username, password }),
		});
		if (response.ok) {
			updateMenu();
			loadPartialView('profile');
			showLocalInfo('You have logged in successfully');
			window.sessionStorage.setItem("loggedIn", "true");
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
