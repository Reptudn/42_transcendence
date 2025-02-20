document.addEventListener('DOMContentLoaded', () => {
	const loginForm = document.querySelector('#login-form') as HTMLFormElement;
	if (!loginForm) return;

	loginForm.addEventListener('submit', async (event) => {
		event.preventDefault();
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
				localStorage.setItem('token', data.token);
				alert('You have logged in successfully');
			} else {
				alert(`Error: ${data.message}`);
			}
		} catch (error) {
			console.error('Error:', error);
			alert('An error occurred. Please try again.');
		}
	});
});