import './script.js';

const testInterval = setInterval(() => {
    console.log('hi from login');
}, 1000);

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
		console.log("cool data received: " + JSON.stringify(data));
		if (response.ok) {
			localStorage.setItem("token", data.token);
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
	loginButton.addEventListener('click', loginAction);
}
