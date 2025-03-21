interface FriendUser {
	id: number;
	username: string;
	displayname: string;
}

function sendFriendRequest(requestId: number, btn: HTMLButtonElement) {
	btn.textContent = 'Request sent';
	btn.style.backgroundColor = 'green';
	btn.disabled = true;

	fetch('/api/friends/request', {
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
	fetch('/api/friends/accept', {
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
function declineFriendRequest(requestId: number) {
	fetch('/api/friends/decline', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
		},
		body: JSON.stringify({ requestId })
	})
		.then(response => response.json())
		.then(data => {
			console.log('Friend request declined:', data.message);
		})
		.catch(error => {
			console.error('Error declining friend request:', error);
		});
}
function removeFriendRequest(friendId: number) {
	fetch('/api/friends/remove', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
		},
		body: JSON.stringify({ friendId })
	})
		.then(response => response.json())
		.then(data => {
			console.log('Friend removed:', data.message);
		})
		.catch(error => {
			console.error('Error removing friend:', error);
		});
}