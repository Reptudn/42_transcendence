import { showLocalError, showLocalInfo } from './alert.js';

export interface FriendUser {
	id: number;
	username: string;
	displayname: string;
}

declare global {
	interface Window {
		acceptFriendRequest: (requestId: number) => void;
		sendFriendRequest: (requestId: number, btn: HTMLButtonElement) => void;
		declineFriendRequest: (requestId: number) => void;
		removeFriendRequest: (friendId: number) => void;
	}
}

export function sendFriendRequest(
	requestId: number,
	btn: HTMLButtonElement | null = null
) {
	if (btn) {
		btn.textContent = 'Request sent';
		btn.style.backgroundColor = 'green';
		btn.disabled = true;
	}

	fetch('/api/friends/request', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
		},
		body: JSON.stringify({ requestId }),
	})
		.then((response) => response.json())
		.then((data) => {
			showLocalInfo(`Friend request sent: ${data.message}`);
		})
		.catch((error) => {
			showLocalError(
				`Error sending friend request: ${error}`,
				undefined,
				5000
			);
			if (btn !== null) {
				btn.textContent = 'Send request';
				btn.style.backgroundColor = '';
				btn.disabled = false;
			}
		});
}

export function acceptFriendRequest(requestId: number) {
	fetch('/api/friends/accept', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
		},
		body: JSON.stringify({ requestId }),
	})
		.then((response) => response.json())
		.then((data) => {
			showLocalInfo(`Friend request accepted: ${data.message}`);
		})
		.catch((error) => {
			showLocalError(
				`Error accepting friend request: ${error}`,
				undefined,
				5000
			);
		});
}
export function declineFriendRequest(requestId: number) {
	fetch('/api/friends/decline', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
		},
		body: JSON.stringify({ requestId }),
	})
		.then((response) => response.json())
		.then((data) => {
			showLocalInfo(`Friend request declined: ${data.message}`);
		})
		.catch((error) => {
			showLocalError(
				`Error declining friend request: ${error}`,
				undefined,
				5000
			);
		});
}
export function removeFriendRequest(friendId: number) {
	fetch('/api/friends/remove', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
		},
		body: JSON.stringify({ friendId }),
	})
		.then((response) => response.json())
		.then((data) => {
			showLocalInfo(`Friend removed: ${data.message}`);
		})
		.catch((error) => {
			showLocalError(`Error removing friend: ${error}`, undefined, 5000);
		});
}

window.sendFriendRequest = sendFriendRequest;
window.acceptFriendRequest = acceptFriendRequest;
window.declineFriendRequest = declineFriendRequest;
window.removeFriendRequest = removeFriendRequest;
