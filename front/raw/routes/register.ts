document.addEventListener('DOMContentLoaded', () => {
	const registerForm = document.querySelector('#register-form') as HTMLFormElement;
	if (registerForm) {
		registerForm.addEventListener('submit', async (event) => {
			event.preventDefault();
			const username = (document.querySelector('#username') as HTMLInputElement).value;
			const email = (document.querySelector('#email') as HTMLInputElement).value;
			const password = (document.querySelector('#password') as HTMLInputElement).value;
			try {
				const response = await fetch('/register', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ username, email, password })
				});
				const data = await response.json();
				if (response.ok) {
					alert('User registered successfully');
					// Optionally, redirect to another page or update the UI
				} else {
					alert(`Error: ${data.message}`);
				}
			} catch (error) {
				console.error('Error:', error);
				alert('An error occurred. Please try again.');
			}
		});
	}
});