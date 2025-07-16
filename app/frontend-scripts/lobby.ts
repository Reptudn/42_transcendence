import { showLocalInfo } from './alert';

const lobbyElement = document.getElementById('lobby') as HTMLElement | null;

export function updateGameSettings(settings: string) {
	if (!lobbyElement) {
		console.error('Lobby element not found!');
		return;
	}
	lobbyElement.innerHTML = settings;
	showLocalInfo('Game settings have been updated!');
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
		updateGameSettings: (settings: string) => void;
		addLocalPlayer: () => Promise<void>;
		// toggleReady: () => void;
	}
}
