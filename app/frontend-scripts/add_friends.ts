import { showLocalError } from './alert.js';
import { Script } from './script_manager.js';

export function fetchFriendSearchResults() {
	const searchInput = document.getElementById(
		'friendSearchInput'
	) as HTMLInputElement | null;
	const query = searchInput ? searchInput.value.trim() : '';
	fetch(`/partial/friends/search?q=${encodeURIComponent(query)}`, {
		headers: {
			Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
		},
	})
		.then((res) => res.text())
		.then((html) => {
			const resultsContainer = document.getElementById('friendSearchResults');
			if (resultsContainer) {
				resultsContainer.innerHTML = html;
			}
		})
		.catch((err) => {
			showLocalError(`Failed to fetch friend search results: ${err}`);
		});
}

let friendSearchInput: HTMLInputElement | null = null;

document
	.getElementById('friendSearchInput')
	?.addEventListener('input', fetchFriendSearchResults);

const add_friends: Script = new Script(
	async () => {
		if (friendSearchInput)
			friendSearchInput.removeEventListener('input', fetchFriendSearchResults);
		friendSearchInput = document.getElementById(
			'friendSearchInput'
		) as HTMLInputElement | null;
		friendSearchInput?.addEventListener('input', fetchFriendSearchResults);
	},
	async () => {
		if (friendSearchInput) {
			friendSearchInput.removeEventListener('input', fetchFriendSearchResults);
			friendSearchInput = null;
		}
	}
);

export default add_friends;
