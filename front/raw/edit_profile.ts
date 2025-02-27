document.getElementById('editProfileForm')?.addEventListener('submit', async (event) => {
	event.preventDefault();

	const form = event.target as HTMLFormElement;
	const formData = new FormData(form);

	const token = localStorage.getItem('token');

	try {
		const response = await fetch('/profile/edit', {
			method: 'POST',
			headers: token ? { 'Authorization': `Bearer ${token}` } : {},
			body: formData
		});

		const data = await response.json();
		if (response.ok) {
			alert('Profile updated successfully! 🎉');
		} else {
			alert(`Error: ${data.message}`);
		}
	} catch (error) {
		console.error('Upload error:', error);
		alert('An error occurred while updating your profile. Please try again.');
	}
});
