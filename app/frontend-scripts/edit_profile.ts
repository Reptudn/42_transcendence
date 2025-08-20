import { showLocalError, showLocalInfo, showLocalLog } from './alert.js';
import { loadPartialView, updateMenu } from './navigator.js';
import './script.js';

export function getFileAsDataURL(input: HTMLInputElement): Promise<string> {
	return new Promise((resolve, reject) => {
		if (!input.files || input.files.length === 0) {
			resolve(''); // No file selected, treat as removal
		} else {
			const file = input.files[0];
			if (file.type !== 'image/png') {
				return reject(new Error('Only PNG images are allowed.'));
			}
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(new Error('Failed to read file.'));
			reader.readAsDataURL(file);
		}
	});
}

const initialValues = {
	username: (document.getElementById('username') as HTMLInputElement).value,
	displayName: (document.getElementById('displayName') as HTMLInputElement).value,
	bio: (document.getElementById('bio') as HTMLTextAreaElement).value,
	profilePicture: (document.getElementById('profilePicture') as HTMLImageElement)
		.src,
};

let profilePictureResetClicked = false;
document
	.getElementById('profilePictureReset')
	?.addEventListener('click', (event) => {
		event.preventDefault();
		profilePictureResetClicked = true;
		const profilePictureInput = document.getElementById(
			'profilePicture'
		) as HTMLInputElement;
		profilePictureInput.value = '';
	});

document
	.getElementById('editprofilesubmit')
	?.addEventListener('click', async (event) => {
		event.preventDefault();

		const formData: { [key: string]: string } = {};

		const usernameField = document.getElementById(
			'username'
		) as HTMLInputElement;
		const displayNameField = document.getElementById(
			'displayName'
		) as HTMLInputElement;
		const bioField = document.getElementById('bio') as HTMLInputElement;
		const profilePictureInput = document.getElementById(
			'profilePicture'
		) as HTMLInputElement;

		if (usernameField.value !== initialValues.username) {
			formData.username = usernameField.value;
		}
		if (displayNameField.value !== initialValues.displayName) {
			formData.displayName = displayNameField.value;
		}
		if (bioField.value !== initialValues.bio) {
			formData.bio = bioField.value;
		}

		try {
			console.log('reset clicked: ', profilePictureResetClicked);
			if (profilePictureInput.value) {
				const profilePictureData = await getFileAsDataURL(
					profilePictureInput
				);
				formData.profile_picture = profilePictureData;
			} else {
				if (profilePictureResetClicked) {
					formData.profile_picture = '';
				}
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				showLocalError(
					`Image conversion error: ${error.message}`,
					undefined,
					5000
				);
			} else {
				showLocalError(
					'An unknown error occurred during image conversion.',
					undefined,
					5000
				);
				showLocalError(
					'An unknown error occurred during image conversion.',
					undefined,
					5000
				);
			}
			return;
		}

		const token = localStorage.getItem('token');

		try {
			const response = await fetch('/api/profile/edit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();
			if (response.ok) {
				showLocalInfo('Profile updated successfully! 🎉', undefined, 5000);
				if (usernameField.value !== initialValues.username) {
					await loadPartialView('profile');
				} else {
					await loadPartialView('profile');
				}
			} else {
				showLocalError(data.message || data.error, undefined, 5000);
			}
		} catch (error) {
			console.error('Upload error:', error);
			showLocalError(
				'An error occurred while updating your profile. Please try again.',
				undefined,
				5000
			);
		}
	});

const initialTitleValues = {
	firstTitle: (document.getElementById('firstTitle') as HTMLInputElement).value,
	secondTitle: (document.getElementById('secondTitle') as HTMLInputElement).value,
	thirdTitle: (document.getElementById('thirdTitle') as HTMLInputElement).value,
};

document
	.getElementById('edittitlesubmit')
	?.addEventListener('click', async (event) => {
		event.preventDefault();

		const formData: { [key: string]: string } = {};

		const firstTitleField = document.getElementById(
			'firstTitle'
		) as HTMLInputElement;
		const secondTitleField = document.getElementById(
			'secondTitle'
		) as HTMLInputElement;
		const thirdTitleField = document.getElementById(
			'thirdTitle'
		) as HTMLInputElement;

		if (firstTitleField.value !== initialTitleValues.firstTitle) {
			formData.firstTitle = firstTitleField.value;
		}
		if (secondTitleField.value !== initialTitleValues.secondTitle) {
			formData.secondTitle = secondTitleField.value;
		}
		if (thirdTitleField.value !== initialTitleValues.thirdTitle) {
			formData.thirdTitle = thirdTitleField.value;
		}

		const token = localStorage.getItem('token');

		try {
			const response = await fetch('/api/profile/edit-title', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();
			if (response.ok) {
				showLocalLog('Title updated successfully! 🎉');
				await loadPartialView('profile');
			} else {
				showLocalError(data.message || data.error, undefined, 5000);
			}
		} catch (error) {
			console.error('Upload error:', error);
			showLocalError(
				'An error occurred while updating your title. Please try again.',
				undefined,
				5000
			);
		}
	});

document
	.getElementById('changepasswordsubmit')
	?.addEventListener('click', async (event) => {
		event.preventDefault();

		const formData: { [key: string]: string } = {};

		const oldPasswordField = document.getElementById(
			'oldPassword'
		) as HTMLInputElement;
		const newPasswordField = document.getElementById(
			'newPassword'
		) as HTMLInputElement;

		if (oldPasswordField.value && newPasswordField.value) {
			formData.oldPassword = oldPasswordField.value;
			formData.newPassword = newPasswordField.value;
		} else {
			showLocalError(
				'Please fill in both fields to change password.',
				undefined,
				5000
			);
			return;
		}

		const token = localStorage.getItem('token');

		try {
			const response = await fetch('/api/profile/edit', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();
			if (response.ok) {
				showLocalInfo('Password updated successfully! 🎉', undefined, 5000);
				localStorage.removeItem('token');
				localStorage.setItem('loggedIn', 'false');
				await loadPartialView('login', true, null, true, true, true);
				updateMenu();
			} else {
				showLocalError(data.message || data.error, undefined, 5000);
			}
		} catch (error) {
			console.error('Upload error:', error);
			showLocalError(
				'An error occurred while updating your password. Please try again.',
				undefined,
				5000
			);
		}
	});

document
	.getElementById('deleteprofilesubmit')
	?.addEventListener('click', async (event) => {
		event.preventDefault();

		const formData: { [key: string]: string } = {};

		const passwordField = document.getElementById(
			'deletePassword'
		) as HTMLInputElement;

		if (passwordField.value) {
			formData.password = passwordField.value;
		}

		const token = localStorage.getItem('token');

		try {
			const response = await fetch('/api/profile/delete', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(token ? { Authorization: `Bearer ${token}` } : {}),
				},
				body: JSON.stringify(formData),
			});

			const data = await response.json();
			if (response.ok) {
				showLocalInfo('Profile deleted successfully! 🎉', undefined, 5000);
				localStorage.setItem('loggedIn', 'false');
				await loadPartialView('register', true, null, true, true, true);
				updateMenu();
			} else {
				showLocalError(data.message || data.error, undefined, 5000);
			}
		} catch (error) {
			console.error('Upload error:', error);
			showLocalError(
				'An error occurred while deleting your profile. Please try again.',
				undefined,
				5000
			);
		}
	});

export function updateCounter(inputId: string, counterId: string, max: number) {
	const input = document.getElementById(inputId);
	const counter = document.getElementById(counterId);
	if (input && counter) {
		input.addEventListener('input', () => {
			counter.textContent = `${
				(input as HTMLInputElement).value.length
			}/${max}`;
		});
		counter.textContent = `${(input as HTMLInputElement).value.length}/${max}`;
	}
}
