import { showLocalError, showLocalInfo } from './alert.js';
import { Script } from './script_manager.js';

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
		},
		body: JSON.stringify({ requestId }),
	})
		.then((response) => response.json())
		.then((data) => {
			showLocalInfo(`Friend request sent: ${data.message}`);
		})
		.catch((error) => {
			showLocalError(`Error sending friend request: ${error}`);
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
		},
		body: JSON.stringify({ requestId }),
	})
		.then((response) => response.json())
		.then((data) => {
			showLocalInfo(`Friend request accepted: ${data.message}`);
		})
		.catch((error) => {
			showLocalError(`Error accepting friend request: ${error}`);
		});
}
export function declineFriendRequest(requestId: number) {
	fetch('/api/friends/decline', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ requestId }),
	})
		.then((response) => response.json())
		.then((data) => {
			showLocalInfo(`Friend request declined: ${data.message}`);
		})
		.catch((error) => {
			showLocalError(`Error declining friend request: ${error}`);
		});
}
export function removeFriendRequest(friendId: number) {
	fetch('/api/friends/remove', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ friendId }),
	})
		.then((response) => response.json())
		.then((data) => {
			showLocalInfo(`Friend removed: ${data.message}`);
		})
		.catch((error) => {
			showLocalError(`Error removing friend: ${error}`);
		});
}

async function load() {
	window.sendFriendRequest = sendFriendRequest;
	window.acceptFriendRequest = acceptFriendRequest;
	window.declineFriendRequest = declineFriendRequest;
	window.removeFriendRequest = removeFriendRequest;
}

async function unload() {
	delete (window as any).sendFriendRequest;
	delete (window as any).acceptFriendRequest;
	delete (window as any).declineFriendRequest;
	delete (window as any).removeFriendRequest;
}

const friends = new Script(load, unload);
export default friends;
