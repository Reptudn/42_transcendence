import './script.js';

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
			showLocalPopup({
				title: 'Login successful',
				description: 'You have logged in successfully',
				color: 'green',
			});
			// alert('You have logged in successfully');
		} else {
			const data = await response.json();
			// alert(`Error: ${data.message}`);
			showLocalPopup({
				title: 'Error',
				description: data.message,
				color: 'red',
			});
		}
	} catch (error) {
		console.error('Error:', error);
		// alert('An error occurred. Please try again.');
		showLocalPopup({
			title: 'Error',
			description: 'An error occurred. Please try again.',
			color: 'red',
		});
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
