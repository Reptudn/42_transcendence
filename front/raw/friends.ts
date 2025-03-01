interface FriendUser {
	id: number;
	username: string;
	displayname: string;
}

function sendFriendRequest(requestId: number, btn: HTMLButtonElement) {
	btn.textContent = 'Request sent';
	btn.style.backgroundColor = 'green';
	btn.disabled = true;

	fetch('/friends/request', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
		},
		body: JSON.stringify({ requestId })
	})
		.then(response => response.json())
		.then(data => {
			console.log('Friend request sent:', data.message);
		})
		.catch(error => {
			console.error('Error sending friend request:', error);
			btn.textContent = 'Send request';
			btn.style.backgroundColor = '';
			btn.disabled = false;
		});
}
function acceptFriendRequest(requestId: number) {
	fetch('/friends/accept', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
		},
		body: JSON.stringify({ requestId })
	})
		.then(response => response.json())
		.then(data => {
			console.log('Friend request accepted:', data.message);
		})
		.catch(error => {
			console.error('Error accepting friend request:', error);
		});
}

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
