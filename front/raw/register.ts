import './script.js';

console.log('Register page');

async function registerAction() {
	const username = (document.querySelector('#username') as HTMLInputElement).value;
	const displayname = (document.querySelector('#displayname') as HTMLInputElement).value;
	const password = (document.querySelector('#password') as HTMLInputElement).value;
	try {
		const response = await fetch('/register', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ username, password, displayname })
		});
		const data = await response.json();
		if (response.ok) {
			alert('You have registered successfully');
			loadPartialView('login');
		} else {
			alert(`Error: ${data.message}`);
		}
	} catch (error) {
		console.error('Error:', error);
		alert('An error occurred. Please try again.');
	}
}

const registerButton = document.getElementById('registerButton');
if (registerButton) {
	registerButton.addEventListener('click', registerAction);
}
