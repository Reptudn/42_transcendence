import './script.js';
import { updateMenu, loadPartialView, abortController } from './script.js';

let loginAction = async () => {
	if (!window.location.pathname.endsWith('/login')) return;

	const username = (document.querySelector('#username') as HTMLInputElement)
		.value;
	const password = (document.querySelector('#password') as HTMLInputElement)
		.value;
	try {
		const response = await fetch('/api/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ username, password }),
		});
		if (response.ok) {
			updateMenu();
			loadPartialView('profile');
			alert('You have logged in successfully');
		} else {
			const data = await response.json();
			alert(`Error: ${data.message}`);
		}
	} catch (error) {
		console.error('Error:', error);
		alert('An error occurred. Please try again.');
	}
};

const loginButton = document.getElementById('loginButton');
if (loginButton) {
	console.log('loginButton found');
	loginButton.addEventListener('click', loginAction, {
		signal: abortController!.signal,
	});
} else {
	console.error('loginButton not found');
}
