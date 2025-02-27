import './script.js';

let loginAction = async () => {

	if (!window.location.pathname.endsWith('/login')) return;

	const username = (document.querySelector('#username') as HTMLInputElement).value;
	const password = (document.querySelector('#password') as HTMLInputElement).value;
	try {
		const response = await fetch('/login', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ username, password })
		});
		const data = await response.json();
		if (response.ok) {
			localStorage.setItem("token", data.token);
			updateMenu();
			loadPartialView('game');
			alert('You have logged in successfully');
		} else {
			alert(`Error: ${data.message}`);
		}
	} catch (error) {
		console.error('Error:', error);
		alert('An error occurred. Please try again.');
	}
}

const loginButton = document.getElementById('loginButton');
if (loginButton) {
	console.log('loginButton found');
	loginButton.addEventListener('click', loginAction, { signal: abortController!.signal });
} else {
	console.error('loginButton not found');
}

