import { showLocalInfo, showLocalError } from './alert.js';
import { setupEventSource } from './events.js';
import { updateMenu, loadPartialView } from './navigator.js';
import './script.js';
import { Script } from './script_manager.js';

const loginAction = async () => {
	const username = (document.querySelector('#username') as HTMLInputElement).value;
	const password = (document.querySelector('#password') as HTMLInputElement).value;

	try {
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ username, password }),
		});

		if (response.ok) {
			const responseData = await response.json();
			if (responseData.twofa_status === true) {
				window.user_id = responseData.userid;
				await loadPartialView(`2fa_code?userid=${responseData.userid}`);
				return;
			}
			updateMenu();
			await loadPartialView('profile', true, null, true, true, true);
			window.localStorage.setItem('loggedIn', 'true');
			showLocalInfo('You have logged in successfully');
			setupEventSource();
		} else {
			const data = await response.json();
			showLocalError(`${data.message}`);
		}
	} catch (error) {
		console.error(error);
		showLocalError('An error occurred. Please try again.');
	}
};

let loginButton: HTMLElement | null = null;

declare global {
	interface Window {
		user_id: number;
	}
}

async function load() {
	loginButton = document.getElementById('loginButton');
	if (loginButton) {
		console.log('loginButton found');
		loginButton.addEventListener('click', loginAction);
	} else {
		console.error('loginButton not found');
	}
}

async function unload() {
	loginButton = null;
}

export const login = new Script(load, unload);
