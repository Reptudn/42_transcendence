import { showLocalInfo, showLocalError } from './alert.js';
import { loadPartialView } from './script.js';

let isInitialized = false;

interface Friend {
	id: number;
	username: string;
	displayname: string;
}

let gameId: number | undefined = undefined;
if (!isInitialized) {
	const res = await fetch('/api/games/create', {
		method: 'POST',
	});
	if (!res.ok) {
		const data = await res.json();
		showLocalError(data.error);
		loadPartialView('profile');
		throw new Error('Failed to create game'); // Stop execution here
	}

	const data = await res.json();
	gameId = data.gameId;
	showLocalInfo(`${data.message} (${data.gameId})`);
	isInitialized = true;
}

do {} while (gameId === undefined || gameId < 0); // Wait until gameId is valid

export async function refreshOnlineFriends() {
	
	const onlineFriendsContainer = document.getElementById('onlineFriendsList');
	if (!onlineFriendsContainer)
	{
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

	if (!friends || friends.length === 0)
	{
		onlineFriendsContainer.innerHTML = `<p>No friends online</p>`;
		return;
	}

	onlineFriendsContainer.innerHTML = friends.map((friend) => `
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
	`).join('')

}

export async function updateSettings(newSettings: any)
{
	const res = await fetch('/api/games/settings', {
		method: 'POST',
		body: newSettings
	});

	if (!res.ok)
	{
		const data = await res.json();
		showLocalError(data.error);
	}
	else
	{
		const data = await res.json();
		showLocalInfo(data.message);
	}
}

const powerupsToggle = document.getElementById(
	'powerups-toggle'
) as HTMLInputElement | null;
powerupsToggle?.addEventListener('change', async (event) => {
	const isChecked = (event.target as HTMLInputElement).checked;
	await updateSettings({ powerupsEnabled: isChecked });
});

const maxPlayerSlider = document.getElementById('players-input') as HTMLInputElement | null;
maxPlayerSlider?.addEventListener('change', async (event) => {
	const newValue = (event.target as HTMLInputElement).value;
	await updateSettings({ maxPlayers: Number(newValue) });
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
	const data = await response.json() as { message: string };
	showLocalInfo(`${data.message}`);
	console.log(`Friend ${friendId} invited successfully.`);
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
	await loadPartialView('profile');
}

export function updatePage(html: string)
{
	const lobbyContainer = document.getElementById('lobby');
	if (lobbyContainer)
		lobbyContainer.innerHTML = html;
	else
		showLocalError('Failed to update lobby due to missing lobby div.');
}

await refreshOnlineFriends();

declare global {
	interface Window {
		refreshOnlineFriends: () => Promise<void>;
		leaveGame: () => Promise<void>;
		updatePage: (html: string) => void;
		kickPlayer: (playerId: number) => Promise<void>;
		addLocalPlayer: () => Promise<void>;
		addUserPlayer: (friendId: number) => Promise<void>;
	}
}

window.refreshOnlineFriends = refreshOnlineFriends;
window.leaveGame = leaveGame;
window.updatePage = updatePage;
window.kickPlayer = kickPlayer;
window.addLocalPlayer = addLocalPlayer;
window.addUserPlayer = addUserPlayer;