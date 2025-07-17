import { showLocalError, showLocalInfo } from './alert.js';

// TODO: handle leave when user just clicks on a different page

export function updatePage(html: string)
{
	const lobbyContainer = document.getElementById('lobby');
	if (lobbyContainer)
		lobbyContainer.innerHTML = html;
	else
		showLocalError('Failed to update lobby due to missing lobby div.');
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

export async function leaveGame() {
	const res = await fetch('/api/games/leave', { method: 'POST' });
	if (res.ok) {
		const data = await res.json();
		console.log('Left game:', data);
		showLocalInfo(`${data.message || 'Left game successfully!'}`);
	} else {
		const error = await res.json();
		console.error('Error leaving game:', error);
		showLocalInfo(
			`${error.error || 'Failed to leave game: Unknown error'}`
		);
	}
}

declare global {
	interface Window {
		updatePage: (html: string) => void;
		addLocalPlayer: () => Promise<void>;
		leaveGame: () => Promise<void>;
	}
}

window.updatePage = updatePage;
window.addLocalPlayer = addLocalPlayer;
window.leaveGame = leaveGame;