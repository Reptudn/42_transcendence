
function fetchFriendSearchResults() {
	const searchInput = document.getElementById('friendSearchInput') as HTMLInputElement;
	const query = searchInput ? searchInput.value.trim() : '';
	fetch(`/friends/search?q=${encodeURIComponent(query)}`, {
		headers: {
			'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
		}
	})
		.then(res => res.json())
		.then(data => {
			if (!data)
				return;

			const resultsContainer = document.getElementById('friendSearchResults');
			if (resultsContainer) {
				let html = '';

				data.results.forEach((user: FriendUser) => {
					html += `<div class="friend-result p-2 border-b">
								<span>${user.displayname} (@${user.username})</span>
								<button onclick="sendFriendRequest(${user.id}, this)" class="accept-btn ml-4 px-3 py-1 border rounded">
								Send request
								</button>
							</div>`;
				});
				resultsContainer.innerHTML = html;
			}
		})
		.catch(err => console.error('Error fetching friend search results:', err));
}

// Poll every second to update friend search results
setInterval(fetchFriendSearchResults, 1000);

// Optionally, update results immediately on input change:
document.getElementById('friendSearchInput')?.addEventListener('input', fetchFriendSearchResults);
