import { showLocalError } from './alert.js';

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
			showLocalError(
				`Failed to fetch friend search results: ${err}`,
				undefined,
				5000
			);
		});
}

const friendSearchInput = document.getElementById(
	'friendSearchInput'
) as HTMLInputElement | null;
friendSearchInput?.addEventListener('input', fetchFriendSearchResults);

document
	.getElementById('friendSearchInput')
	?.addEventListener('input', fetchFriendSearchResults);
