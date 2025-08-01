import { showLocalInfo, showLocalError } from './alert.js';
import { game_over, setGameOverVar } from './events.js';
import { loadPartialView, onUnloadPageAsync } from './navigator.js';

interface Friend {
	id: number;
	username: string;
	displayname: string;
}

setGameOverVar(false);

export async function refreshOnlineFriends() {
	const onlineFriendsContainer = document.getElementById('onlineFriendsList');
	if (!onlineFriendsContainer) {
		showLocalError('No online friends container!');
		return;
	}

	const response = await fetch('/api/friends/online', { method: 'GET' });
	if (!response.ok) {
		showLocalError(
			await response
				.json()
				.then((err) => err.error || 'Failed to fetch friends')
		);
		throw new Error('Failed to fetch friends list');
	}
	const friends: Friend[] = await response.json();

	if (!friends || friends.length === 0) {
		onlineFriendsContainer.innerHTML = `<p>No friends online</p>`;
		return;
	}

	onlineFriendsContainer.innerHTML = friends
		.map(
			(friend) => `
		<div class="friend-item p-3 border rounded mb-2">
		<div class="friend-info mb-2">
			<span class="font-semibold">${friend.displayname}</span>
			<span class="glow-blue">(@${friend.username})</span>
		</div>
		<button
			onclick="addUserPlayer(${friend.id})"
			class="invite-btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
		>
			Invite Friend
		</button>
		</div>
	`
		)
		.join('');
}

export async function updateSettings(newSettings: any) {
	const res = await fetch('/api/games/settings', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(newSettings),
	});

	if (!res.ok) {
		const data = await res.json();
		showLocalError(data.error);
	}
	// else
	// {
	// 	const data = await res.json();
	// 	showLocalInfo(data.message);
	// }
}

const powerupsToggle = document.getElementById(
	'powerups-toggle'
) as HTMLInputElement | null;
powerupsToggle?.addEventListener('change', async (event) => {
	const isChecked = (event.target as HTMLInputElement).checked;
	await updateSettings({ powerupsEnabled: isChecked });
});

const maxPlayerSlider = document.getElementById(
	'difficulty-input'
) as HTMLInputElement | null;
maxPlayerSlider?.addEventListener('change', async (event) => {
	const newValue = (event.target as HTMLInputElement).value;
	await updateSettings({ gameDifficulty: Number(newValue) });
});

const mapSelect = document.getElementById('map-select') as HTMLSelectElement | null;
mapSelect?.addEventListener('change', async (event) => {
	const selectedMap = (event.target as HTMLSelectElement).value;
	await updateSettings({ map: selectedMap.toLocaleLowerCase() });
});

const gameTypeSelector = document.getElementById('game-type-select') as HTMLSelectElement | null;
gameTypeSelector?.addEventListener('change', async (event) => {
	const selectedGameType = (event.target as HTMLSelectElement).value;
	await updateSettings({ gameType: selectedGameType.toLocaleLowerCase() });
});

export async function addPowerUp() {
	console.log('Adding power-up...');
	alert('Not implemented');
}

export async function addAIPlayer() {
	console.log('Adding AI player...');
	const res = await fetch('/api/games/players/add/ai', { method: 'POST' });

	if (!res.ok) {
		const error = await res.json();
		showLocalError(`${error.error || 'Failed to add AI player: Unknown error'}`);
		return;
	}
	const data = await res.json();
	console.log('AI player added:', data);
	showLocalInfo(`${data.message || 'AI player added successfully!'}`);
}

export async function addUserPlayer(friendId: number) {
	console.log('Inviting friend');

	const response = await fetch(`/api/games/invite/${friendId}`, {
		method: 'POST',
	});
	if (!response.ok) {
		const error = await response.json();
		showLocalError(`${error.error}`);
		throw new Error(`Failed to invite friend: ${error.error}`);
	}
	const data = (await response.json()) as { message: string };
	showLocalInfo(`${data.message}`);
	console.log(`Friend ${friendId} invited successfully.`);
}

export async function addLocalPlayer() {
	console.log('Adding local player...');

	const res = await fetch('/api/games/players/add/local', { method: 'POST' });

	if (!res.ok) {
		const data = await res.json();
		showLocalError(
			`${data.error || 'Failed to add Local player: Unknown error'}`
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
		const data = await res.json();
		showLocalError(`${data.error || 'Failed to kick player: Unknown error'}`);
		return;
	}
	const data = await res.json();
	console.log('Player kicked:', data);
	showLocalInfo(`${data.message || 'Player kicked successfully!'}`);
}

export async function leaveGame() {

	if (game_over) return;

	console.log('Leaving game...');
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

export async function startGame() {
	const res = await fetch('/api/games/start', { method: 'POST' });

	if (!res.ok) {
		const error = await res.json();
		showLocalError(`${error.error || 'Failed to start game: Unknown error'}`);
		return;
	}
	const data = await res.json();
	console.log('Game started:', data);
	showLocalInfo(`${data.message || 'Game started successfully!'}`);
}

export function updatePage(html: string) {
	const lobbyContainer = document.getElementById('lobby');
	if (lobbyContainer) lobbyContainer.innerHTML = html;
	else showLocalError('Failed to update lobby due to missing lobby div.');
}

await refreshOnlineFriends();

onUnloadPageAsync(async() => { await leaveGame(); });

declare global {
	interface Window {
		refreshOnlineFriends: () => Promise<void>;
		leaveGame: () => Promise<void>;
		updatePage: (html: string) => void;
		kickPlayer: (playerId: number) => Promise<void>;
		addLocalPlayer: () => Promise<void>;
		addUserPlayer: (friendId: number) => Promise<void>;
		addAIPlayer: () => Promise<void>;
		startGame: () => Promise<void>;
	}
}

window.refreshOnlineFriends = refreshOnlineFriends;
window.leaveGame = leaveGame;
window.updatePage = updatePage;
window.kickPlayer = kickPlayer;
window.addLocalPlayer = addLocalPlayer;
window.addUserPlayer = addUserPlayer;
window.addAIPlayer = addAIPlayer;
window.startGame = startGame;
