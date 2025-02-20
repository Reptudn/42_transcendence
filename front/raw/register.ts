document.addEventListener('DOMContentLoaded', () => {
	const registerButton = document.getElementById('registerButton');
	if (registerButton === null) {
		console.error('Element not found: registerButton');
		return;
	}
	registerButton.addEventListener('click', async (event) => {
		event.preventDefault();
		alert('Register button clicked');
		const usernameField = document.querySelector('#username') as HTMLInputElement;
		const displaynameField = document.querySelector('#displayname') as HTMLInputElement;
		const passwordField = document.querySelector('#password') as HTMLInputElement;
		if (usernameField === null || displaynameField === null || passwordField === null) {
			console.error('Element not found: username, displayname, or password');
			return;
		}
		try {
			const response = await fetch('/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ username: usernameField.value, password: passwordField.value, displayname: displaynameField.value })
			});
			const data = await response.json();
			if (response.ok) {
				alert('You have registered successfully');
			} else {
				alert(`Error: ${data.message}`);
			}
			usernameField.value = '';
			displaynameField.value = '';
			passwordField.value = '';
		} catch (error) {
			console.error('Error:', error);
			alert('An error occurred. Please try again.');
		}
	});
});