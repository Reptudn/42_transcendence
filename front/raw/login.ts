document.addEventListener('DOMContentLoaded', () => {
	const loginButton = document.getElementById('loginButton');
	if (loginButton === null) {
		console.error('Element not found: loginButton');
		return;
	}
	loginButton.addEventListener('click', async (event) => {
		event.preventDefault();
		const usernameField = (document.querySelector('#username') as HTMLInputElement);
		const passwordField = (document.querySelector('#password') as HTMLInputElement);
		if (usernameField === null || passwordField === null) {
			console.error('Element not found: username or password');
			return;
		}
		try {
			const response = await fetch('/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ username: usernameField.value, password: passwordField.value })
			});
			const data = await response.json();
			if (response.ok) {
				localStorage.setItem('token', data.token);
				alert('You have logged in successfully');
			} else {
				alert(`Error: ${data.message}`);
			}
			usernameField.value = '';
			passwordField.value = '';
		} catch (error) {
			console.error('Error:', error);
			alert('An error occurred. Please try again.');
		}
	});
});