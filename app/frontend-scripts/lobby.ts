import { showLocalInfo } from "./alert";

enum PlayerType {
	USER = 'user',
	AI = 'ai',
	LOCAL = 'local',
	SPECTATOR = 'spectator',
}

interface GameSettings {
	players:
		| [
				// 0 - 3
				{
					type: PlayerType;
					id: number;
					aiLevel?: number;
					localPlayerId?: number;
					aiOrLocalPlayerName?: string;
					ready: boolean;
				}
		  ]
		| null; // null if no players are set
	gameDifficulty: number; // 1 - 10
	powerups: boolean;
	map: string; // map name from data/maps/*.json
	playerLives: number; // >= 1
	maxPlayers: number;
}

export function updateGameSettings(settings: GameSettings) {
	console.log('The Game settings have been updated')
	showLocalInfo('The Game settings have been updated');
	console.info(settings);
	const gameSettingsElement = document.getElementById('lobbySettings');
	if (gameSettingsElement) {
		gameSettingsElement.innerHTML = `
		<h1>Difficulty ${settings.gameDifficulty}</h1>
		<h1>Powerups ${settings.powerups ? 'Enabled' : 'Disabled'}</h1>
		<h1>Map ${settings.map}</h1>
		<h1>Player Lives ${settings.playerLives}</h1>
		<h1>Max Players ${settings.maxPlayers}</h1>
		`;
	}

	const playersList = document.getElementById('playerList');
	if (playersList && settings.players) {
		playersList.innerHTML = settings.players
			.map(
				(player) => `
			<div>
				<h2>${player.aiOrLocalPlayerName || `Player ${player.id}`}</h2>
				<p>Type: ${player.type}</p>
				<p>Ready: ${player.ready ? 'Yes' : 'No'}</p>
			</div>
		`
			)
			.join('');
	}
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
		updateGameSettings: (settings: any) => void;
		// toggleReady: () => void;
	}
}