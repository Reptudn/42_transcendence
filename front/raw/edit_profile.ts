import './script.js';

function getFileAsDataURL(input: HTMLInputElement): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!input.files || input.files.length === 0) {
			resolve(''); // No file selected, treat as removal
		} else {
			const file = input.files[0];
			if (file.type !== 'image/png') {
				return reject(new Error("Only PNG images are allowed."));
			}
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(new Error("Failed to read file."));
			reader.readAsDataURL(file);
		}
	});
}

document.getElementById('editprofilesubmit')?.addEventListener('click', async (event) => {
	event.preventDefault();

	const formData: { [key: string]: string } = {};

	const usernameField = document.getElementById('username') as HTMLInputElement;
	const displayNameField = document.getElementById('displayName') as HTMLInputElement;
	const bioField = document.getElementById('bio') as HTMLInputElement;
	const oldPasswordField = document.getElementById('oldPassword') as HTMLInputElement;
	const newPasswordField = document.getElementById('newPassword') as HTMLInputElement;
	const profilePictureInput = document.getElementById('profilePicture') as HTMLInputElement;

	if (usernameField.value) {
		formData['username'] = usernameField.value;
	}
	if (displayNameField.value) {
		formData['displayName'] = displayNameField.value;
	}
	if (bioField.value) {
		formData['bio'] = bioField.value;
	}
	if (oldPasswordField.value && newPasswordField.value) {
		formData['oldPassword'] = oldPasswordField.value;
		formData['newPassword'] = newPasswordField.value;
	}

	try {
		const profilePictureData = await getFileAsDataURL(profilePictureInput);
		formData['profile_picture'] = profilePictureData;
	} catch (error: any) {
		alert('Image conversion error: ' + error.message);
		return;
	}

	let noteWorthyChange = (oldPasswordField.value && newPasswordField.value) || usernameField.value;

	const token = localStorage.getItem('token');

	try {
		const response = await fetch('/profile/edit', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(token ? { 'Authorization': `Bearer ${token}` } : {})
			},
			body: JSON.stringify(formData)
		});

		const data = await response.json();
		if (response.ok) {
			alert('Profile updated successfully! 🎉');
			if (noteWorthyChange) {
				localStorage.removeItem('token');
				loadPartialView('login');
			}
			else {
				loadPartialView('profile');
			}
		} else {
			alert(`Error: ${data.message}`);
		}
	} catch (error) {
		console.error('Upload error:', error);
		alert('An error occurred while updating your profile. Please try again.');
	}
});
