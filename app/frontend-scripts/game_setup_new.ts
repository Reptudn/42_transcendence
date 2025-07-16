import { showLocalInfo, showLocalError } from './alert.js';
import { loadPartialView } from './script.js';

interface Friend {
	id: number;
	username: string;
	displayname: string;
}

let gameId: number | undefined = undefined;
const res = await fetch('/api/games/create', {
	method: 'POST'
});
if (!res.ok) {
	showLocalError(`Failed to create game: ${res.statusText}`);
	loadPartialView('profile');
	throw new Error('Failed to create game'); // Stop execution here
}

const data = await res.json();
gameId = data.gameId;
showLocalInfo(`Game created with ID: ${gameId}`);

do {} while (gameId === undefined || gameId < 0); // Wait until gameId is valid

const friends: Friend[] = await fetch('/api/friends/online', { method: 'GET' })
	.then(async (response) => {
		if (!response.ok) {
			showLocalError(await response.json().then(err => err.error || 'Failed to fetch friends'));
			throw new Error('Failed to fetch friends list');
		}
		return response.json();
	})
	.then((data) => {
		if (!Array.isArray(data)) {
			showLocalError('Invalid friends data format');
			throw new Error('Invalid friends data format');
		}
		return data;
	})
	.catch((error) => {
		console.error('Error fetching friends:', error);
		showLocalError('Failed to load friends list. Please try again later.');
		return [];
	}
);