import { showLocalError, showLocalInfo } from './alert.js';
import { loadPartialView, onUnloadPageAsync } from './navigator.js';

export function updatePage(html: string) {
	const lobbyContainer = document.getElementById('lobby');
	if (lobbyContainer) lobbyContainer.innerHTML = html;
	else showLocalError('Failed to update lobby due to missing lobby div.');
}

export async function addLocalPlayer() {
	const res = await fetch('/api/games/players/add/local', { method: 'POST' });
	if (res.ok) {
		const data = await res.json();
		console.log('Local player added:', data);
		showLocalInfo(`${data.message || 'Local player added successfully!'}`);
	} else {
		const error = await res.json();
		console.error('Error adding local player:', error);
		showLocalInfo(
			`${error.error || 'Failed to add local player: Unknown error'}`
		);
	}
}

export async function renameLocalPlayer(id: number) {
	const newName = prompt('Enter new name for local player:');
	if (!newName) return;

	const res = await fetch(`/api/games/settings`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ localPlayerUpdate: { playerId: id, name: newName } }),
	});

	if (res.ok) {
		const data = await res.json();
		console.log('Local player renamed:', data);
		showLocalInfo(`${data.message || 'Player renamed successfully!'}`);
	} else {
		const error = await res.json();
		console.error('Error renaming local player:', error);
		showLocalInfo(`${error.error || 'Failed to rename player: Unknown error'}`);
	}
}

export async function kickPlayer(playerId: number) {
	console.log(`Kicking player with ID: ${playerId}`);

	const res = await fetch(`/api/games/players/kick/${playerId}`, {
		method: 'POST',
	});

	if (!res.ok) {
		const data = await res.json();
		showLocalError(`${data.error || 'Failed to kick player: Unknown error'}`);
		return;
	}
	const data = await res.json();
	console.log('Player kicked:', data);
	showLocalInfo(`${data.message || 'Player kicked successfully!'}`);
}

export async function leaveGame() {
	const res = await fetch('/api/games/leave', { method: 'POST' });
	if (res.ok) {
		const data = await res.json();
		console.log('Left game:', data);
		showLocalInfo(`${data.message || 'Left game successfully!'}`);
	} else {
		const error = await res.json();
		console.error('Error leaving game:', error);
		showLocalInfo(`${error.error || 'Failed to leave game: Unknown error'}`);
	}
	await loadPartialView('profile');
}

setTimeout(() => {
	onUnloadPageAsync(async () => {
		await leaveGame();
	});
}, 0);

declare global {
	interface Window {
		updatePage: (html: string) => void;
		addLocalPlayer: () => Promise<void>;
		leaveGame: () => Promise<void>;
		renameLocalPlayer: (id: number) => Promise<void>;
		kickPlayer: (playerId: number) => Promise<void>;
	}
}

window.updatePage = updatePage;
window.addLocalPlayer = addLocalPlayer;
window.leaveGame = leaveGame;
window.renameLocalPlayer = renameLocalPlayer;
window.kickPlayer = kickPlayer;
