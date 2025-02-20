async function loginAction() {
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
			localStorage.setItem("token", data);
			window.location.href = '/partial/profile';
			alert('You have logged in successfully');
		} else {
			alert(`Error: ${data.message}`);
		}
	} catch (error) {
		console.error('Error:', error);
		alert('An error occurred. Please try again.');
	}
}

document.addEventListener('DOMContentLoaded', () => {
	const loginButton = document.getElementById('loginButton');
	if (loginButton) {
		loginButton.addEventListener('click', registerAction);
	}
});
