import { showLocalError, showLocalInfo, showLocalLog } from './alert.js';
import { loadPartialView, updateMenu } from './navigator.js';
import './script.js';
import { Script } from './script_manager.js';

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

// Fixed: Initialize these properly - they will be set in the load function
let initialValues: any = {};
let initialTitleValues: any = {};
let profilePictureResetClicked = false;

// Store element references
let profilePictureReset: HTMLElement | null = null;
let editprofilesubmit: HTMLElement | null = null;
let edittitlesubmit: HTMLElement | null = null;
let changepasswordsubmit: HTMLElement | null = null;
let deleteprofilesubmit: HTMLElement | null = null;

// Store function references for cleanup
let profilePictureResetHandler: ((event: Event) => void) | null = null;
let editProfileSubmitHandler: ((event: Event) => Promise<void>) | null = null;
let editTitleSubmitHandler: ((event: Event) => Promise<void>) | null = null;
let changePasswordSubmitHandler: ((event: Event) => Promise<void>) | null = null;
let deleteProfileSubmitHandler: ((event: Event) => Promise<void>) | null = null;

export function updateCounter(inputId: string, counterId: string, max: number) {
	const input = document.getElementById(inputId);
	const counter = document.getElementById(counterId);
	if (input && counter) {
		const handler = () => {
			counter.textContent = `${
				(input as HTMLInputElement).value.length
			}/${max}`;
		};
		input.addEventListener('input', handler);
		handler(); // Set initial value
	}
}

const edit_profile = new Script(
	async () => {
		console.log('[EditProfile] Loading edit profile script...');

		// Initialize values after DOM is ready
		const usernameEl = document.getElementById('username') as HTMLInputElement;
		const displayNameEl = document.getElementById(
			'displayName'
		) as HTMLInputElement;
		const bioEl = document.getElementById('bio') as HTMLTextAreaElement;
		const profilePictureEl = document.getElementById(
			'profilePicture'
		) as HTMLImageElement;

		initialValues = {
			username: usernameEl?.value || '',
			displayName: displayNameEl?.value || '',
			bio: bioEl?.value || '',
			profilePicture: profilePictureEl?.src || '',
		};

		const firstTitleEl = document.getElementById(
			'firstTitle'
		) as HTMLInputElement;
		const secondTitleEl = document.getElementById(
			'secondTitle'
		) as HTMLInputElement;
		const thirdTitleEl = document.getElementById(
			'thirdTitle'
		) as HTMLInputElement;

		initialTitleValues = {
			firstTitle: firstTitleEl?.value || '',
			secondTitle: secondTitleEl?.value || '',
			thirdTitle: thirdTitleEl?.value || '',
		};

		// Get DOM elements
		profilePictureReset = document.getElementById('profilePictureReset');
		editprofilesubmit = document.getElementById('editprofilesubmit');
		edittitlesubmit = document.getElementById('edittitlesubmit');
		changepasswordsubmit = document.getElementById('changepasswordsubmit');
		deleteprofilesubmit = document.getElementById('deleteprofilesubmit');

		// Create handler functions
		profilePictureResetHandler = (event) => {
			event.preventDefault();
			profilePictureResetClicked = true;
			const profilePictureInput = document.getElementById(
				'profilePicture'
			) as HTMLInputElement;
			if (profilePictureInput) {
				profilePictureInput.value = '';
			}
		};

		editProfileSubmitHandler = async (event) => {
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

			if (usernameField && usernameField.value !== initialValues.username) {
				formData.username = usernameField.value;
			}
			if (
				displayNameField &&
				displayNameField.value !== initialValues.displayName
			) {
				formData.displayName = displayNameField.value;
			}
			if (bioField && bioField.value !== initialValues.bio) {
				formData.bio = bioField.value;
			}

			try {
				console.log('reset clicked: ', profilePictureResetClicked);
				if (profilePictureInput && profilePictureInput.value) {
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
					showLocalError(`Image conversion error: ${error.message}`);
				} else {
					showLocalError(
						'An unknown error occurred during image conversion.'
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
					showLocalInfo('Profile updated successfully! 🎉');
					if (
						usernameField &&
						usernameField.value !== initialValues.username
					) {
						await loadPartialView('profile');
					} else {
						await loadPartialView('profile');
					}
				} else {
					showLocalError(data.message || data.error);
				}
			} catch (error) {
				console.error('Upload error:', error);
				showLocalError(
					'An error occurred while updating your profile. Please try again.'
				);
			}
		};

		editTitleSubmitHandler = async (event) => {
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

			if (
				firstTitleField &&
				firstTitleField.value !== initialTitleValues.firstTitle
			) {
				formData.firstTitle = firstTitleField.value;
			}
			if (
				secondTitleField &&
				secondTitleField.value !== initialTitleValues.secondTitle
			) {
				formData.secondTitle = secondTitleField.value;
			}
			if (
				thirdTitleField &&
				thirdTitleField.value !== initialTitleValues.thirdTitle
			) {
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
					showLocalError(data.message || data.error);
				}
			} catch (error) {
				console.error('Upload error:', error);
				showLocalError(
					'An error occurred while updating your title. Please try again.'
				);
			}
		};

		changePasswordSubmitHandler = async (event) => {
			event.preventDefault();

			const formData: { [key: string]: string } = {};

			const oldPasswordField = document.getElementById(
				'oldPassword'
			) as HTMLInputElement;
			const newPasswordField = document.getElementById(
				'newPassword'
			) as HTMLInputElement;

			if (oldPasswordField?.value && newPasswordField?.value) {
				formData.oldPassword = oldPasswordField.value;
				formData.newPassword = newPasswordField.value;
			} else {
				showLocalError('Please fill in both fields to change password.');
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
					showLocalInfo('Password updated successfully! 🎉');
					localStorage.removeItem('token');
					localStorage.setItem('loggedIn', 'false');
					await loadPartialView('login', true, null, true, true, true);
					updateMenu();
				} else {
					showLocalError(data.message || data.error);
				}
			} catch (error) {
				console.error('Upload error:', error);
				showLocalError(
					'An error occurred while updating your password. Please try again.'
				);
			}
		};

		deleteProfileSubmitHandler = async (event) => {
			event.preventDefault();

			const formData: { [key: string]: string } = {};

			const passwordField = document.getElementById(
				'deletePassword'
			) as HTMLInputElement;

			if (passwordField?.value) {
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
					showLocalInfo('Profile deleted successfully! 🎉');
					localStorage.setItem('loggedIn', 'false');
					await loadPartialView('register', true, null, true, true, true);
					updateMenu();
				} else {
					showLocalError(data.message || data.error);
				}
			} catch (error) {
				console.error('Upload error:', error);
				showLocalError(
					'An error occurred while deleting your profile. Please try again.'
				);
			}
		};

		// Attach event listeners
		profilePictureReset?.addEventListener('click', profilePictureResetHandler);
		editprofilesubmit?.addEventListener('click', editProfileSubmitHandler);
		edittitlesubmit?.addEventListener('click', editTitleSubmitHandler);
		changepasswordsubmit?.addEventListener('click', changePasswordSubmitHandler);
		deleteprofilesubmit?.addEventListener('click', deleteProfileSubmitHandler);

		// Setup counters
		updateCounter('username', 'usernameCounter', 20);
		updateCounter('displayName', 'displayNameCounter', 20);
		updateCounter('bio', 'bioCounter', 200);
		updateCounter('firstTitle', 'firstTitleCounter', 20);
		updateCounter('secondTitle', 'secondTitleCounter', 20);
		updateCounter('thirdTitle', 'thirdTitleCounter', 20);

		console.log('[EditProfile] Edit profile script loaded successfully');
	},
	async () => {
		console.log('[EditProfile] Unloading edit profile script...');

		// Remove event listeners
		if (profilePictureReset && profilePictureResetHandler) {
			profilePictureReset.removeEventListener(
				'click',
				profilePictureResetHandler
			);
		}
		if (editprofilesubmit && editProfileSubmitHandler) {
			editprofilesubmit.removeEventListener('click', editProfileSubmitHandler);
		}
		if (edittitlesubmit && editTitleSubmitHandler) {
			edittitlesubmit.removeEventListener('click', editTitleSubmitHandler);
		}
		if (changepasswordsubmit && changePasswordSubmitHandler) {
			changepasswordsubmit.removeEventListener(
				'click',
				changePasswordSubmitHandler
			);
		}
		if (deleteprofilesubmit && deleteProfileSubmitHandler) {
			deleteprofilesubmit.removeEventListener(
				'click',
				deleteProfileSubmitHandler
			);
		}

		// Clear references
		profilePictureReset = null;
		editprofilesubmit = null;
		edittitlesubmit = null;
		changepasswordsubmit = null;
		deleteprofilesubmit = null;

		// Clear handler references
		profilePictureResetHandler = null;
		editProfileSubmitHandler = null;
		editTitleSubmitHandler = null;
		changePasswordSubmitHandler = null;
		deleteProfileSubmitHandler = null;

		// Reset state
		profilePictureResetClicked = false;
		initialValues = {};
		initialTitleValues = {};

		console.log('[EditProfile] Edit profile script unloaded successfully');
	}
);

export default edit_profile;
