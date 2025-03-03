function fetchFriendSearchResults() {
	const searchInput = document.getElementById('friendSearchInput') as HTMLInputElement | null;
	const query = searchInput ? searchInput.value.trim() : '';
	fetch(`/partial/friends/search?q=${encodeURIComponent(query)}`, {
		headers: {
			'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
		}
	})
		.then(res => res.text())
		.then(html => {
			const resultsContainer = document.getElementById('friendSearchResults');
			if (resultsContainer) {
				resultsContainer.innerHTML = html;
			}
		})
		.catch(err => console.error('Error fetching friend search results:', err));
}

// TODO: refresh every input value change instead
setInterval(fetchFriendSearchResults, 1000);

document.getElementById('friendSearchInput')?.addEventListener('input', fetchFriendSearchResults);
