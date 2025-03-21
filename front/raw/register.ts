import './script.js';

let registerAction = async () => {

	if (!window.location.pathname.endsWith('/register')) return;

	const username = (document.querySelector('#username') as HTMLInputElement).value;
	const displayname = (document.querySelector('#displayname') as HTMLInputElement).value;
	const password = (document.querySelector('#password') as HTMLInputElement).value;
	try {
		const response = await fetch('/api/register', {
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
	console.log('registerButton found');
	registerButton.addEventListener('click', registerAction, { signal: abortController!.signal });
} else console.error('registerButton not found');

function updateCounter(inputId: string, counterId: string, max: number) {
	const input = document.getElementById(inputId);
	const counter = document.getElementById(counterId);
	if (input && counter) {
		input.addEventListener('input', () => {
			counter.textContent = (input as HTMLInputElement).value.length + '/' + max;
		});
		counter.textContent = (input as HTMLInputElement).value.length + '/' + max;
	}
}
updateCounter('username', 'usernameCounter', 16);
updateCounter('displayname', 'displaynameCounter', 32);
