import { showLocalInfo, showLocalError } from './alert.js';
import { loadPartialView } from './script.js';

interface Friend {
	id: number;
	username: string;
	displayname: string;
}

let gameId: number | undefined = undefined;
const res = await fetch('/api/games/create', {
	method: 'POST',
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
			showLocalError(
				await response
					.json()
					.then((err) => err.error || 'Failed to fetch friends')
			);
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
	});

const powerupsToggle = document.getElementById(
	'powerups-toggle'
) as HTMLInputElement | null;
powerupsToggle?.addEventListener('change', async (event) => {
	const isChecked = (event.target as HTMLInputElement).checked;
	console.log(
		`Powerups toggle changed: ${isChecked ? 'Enabled' : 'Disabled'}`
	);
});

export async function addPowerUp() {
	console.log('Adding power-up...');
}

export async function addAIPlayer() {
	console.log('Adding AI player...');
	const res = await fetch('/api/games/players/add/ai', { method: 'POST' });

	if (!res.ok) {
		const error = await res.json();
		showLocalError(
			`${error.error || 'Failed to add AI player: Unknown error'}`
		);
		return;
	}
	const data = await res.json();
	console.log('AI player added:', data);
	showLocalInfo(`${data.message || 'AI player added successfully!'}`);
}

export async function addLocalPlayer() {
	console.log('Adding local player...');

	const res = await fetch('/api/games/players/add/local', { method: 'POST' });

	if (!res.ok) {
		const error = await res.json();
		showLocalError(
			`${error.error || 'Failed to add Local player: Unknown error'}`
		);
		return;
	}
	const data = await res.json();
	console.log('AI player added:', data);
	showLocalInfo(`${data.message || 'Local player added successfully!'}`);
}

export async function kickPlayer(playerId: number) {
	console.log(`Kicking player with ID: ${playerId}`);

	const res = await fetch(`/api/games/players/kick/${playerId}`, {
		method: 'POST',
	});

	if (!res.ok) {
		const error = await res.json();
		showLocalError(
			`${error.error || 'Failed to kick player: Unknown error'}`
		);
		return;
	}
	const data = await res.json();
	console.log('Player kicked:', data);
	showLocalInfo(`${data.message || 'Player kicked successfully!'}`);
}

export async function leaveGame() {
	console.log('Leaving game...');
	loadPartialView('profile');
}
