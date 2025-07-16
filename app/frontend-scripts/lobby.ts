import { showLocalInfo } from "./alert";

const lobbyElement = document.getElementById('lobby') as HTMLElement | null;

export function updateGameSettings(settings: string) {
	if (!lobbyElement) {
		console.error('Lobby element not found!');
		return;
	}
	lobbyElement.innerHTML = settings;
	showLocalInfo('Game settings have been updated!');
}

const addLocalPlayerBtn = document.getElementById('addLocalPlayerBtn') as HTMLButtonElement | null;
if (addLocalPlayerBtn) {
	addLocalPlayerBtn.addEventListener('click', async () => {
		// const playerName = prompt('Enter local player name:');
		// if (!playerName) {
		// 	showLocalInfo('No player name provided.');
		// 	return;
		// }

		const res = await fetch('/api/games/players/add/local', { method: 'POST' });
		if (res.ok) {
			const data = await res.json();
			console.log('Local player added:', data);
			showLocalInfo(`${data.message || 'Local player added successfully!'}`);
		} else {
			const error = await res.json();
			console.error('Error adding local player:', error);
			showLocalInfo(`${error.error || 'Failed to add local player: Unknown error'}`);
		}
	});
} else {
	console.error('Add Local Player button not found!');
}

// export async function toggleReady()
// {
// 	const result = await fetch('/game/toggleReady', {
// 		method: 'POST'
// 	});

// 	if (result.ok) {
// 		const data = await result.json();
// 		console.log('Toggle ready response:', data);
// 		showLocalInfo(data.message);
// 	} else {
// 		console.error('Error toggling ready state:', result.statusText);
// 		showLocalError('Failed to toggle ready state!');
// 	}
// }

declare global {
	interface Window {
		updateGameSettings: (settings: string) => void;
		// toggleReady: () => void;
	}
};