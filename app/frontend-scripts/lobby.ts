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