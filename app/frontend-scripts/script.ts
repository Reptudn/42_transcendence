import { showLocalError, showLocalInfo } from './alert.js';
import { loadPartialView, updateMenu } from './navigator.js';
import { closeAllPopups } from './popup.js';

declare global {
	interface Window {
		logout: () => Promise<void>;
		fetchNumber: () => Promise<void>;
		updateNumber: (increment: number) => Promise<void>;
		notifyEventSource: EventSource | null;
		createGame: () => Promise<void>;
	}
}

export async function createGame() {
	const res = await fetch('/api/games/create', {
		method: 'POST',
	});
	if (!res.ok) {
		const data = await res.json();
		showLocalError(`${data.error}`);
		return;
	}

	const data = await res.json();
	showLocalInfo(`${data.message} (${data.gameId})`);
	await loadPartialView('lobby_admin', true, null, true);
}

export async function leaveGame() {
	const response = await fetch('/api/games/leave', {
		method: 'POST',
	});

	if (!response.ok) {
		showLocalError(`Failed to leave game: ${response.statusText}`);
		return;
	}

	showLocalInfo('You have left the game successfully.');
}

// THE number
let numberFetchFailed = false;

async function fetchNumber(): Promise<void> {
	if (numberFetchFailed) {
		return;
	}
	try {
		const response = await fetch('/number');
		const data = await response.json();
		const displayElement = document.getElementById('numberDisplay');
		if (displayElement) {
			displayElement.textContent = data.number.toString();
		}
	} catch (error) {
		numberFetchFailed = true;
		showLocalError(`Error fetching number: ${error}`);
	}
}
async function updateNumber(increment: number): Promise<void> {

	if (window.localStorage.getItem('loggedIn') !== 'true')
	{
		showLocalError('You need to be logged in to do this!');
		return;
	}

	try {
		const response = await fetch('/number', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ number: increment }),
		});
		if (!response.ok) return;
		const data = await response.json();
		const displayElement = document.getElementById('numberDisplay');
		if (displayElement) {
			displayElement.textContent = data.number.toString();
		}
	} catch (error) {
		showLocalError(`Error updating number: ${error}`);
	}
}
const numberDisplay = document.getElementById('numberDisplay');
if (numberDisplay && !numberDisplay.hasAttribute('data-listener-added')) {
	numberDisplay.addEventListener('click', () => {
		updateNumber(1);
	});
	numberDisplay.setAttribute('data-listener-added', 'true');
}
setInterval(fetchNumber, 100000);
document.addEventListener('DOMContentLoaded', fetchNumber);

async function logout(): Promise<void> {
	try {
		const response = await fetch('/api/auth/logout', { method: 'POST' });
		if (response.ok) {
			updateMenu();
			await loadPartialView('index', true, null, true, true);
			window.localStorage.setItem('loggedIn', 'false');
			window.notifyEventSource?.close();
			window.notifyEventSource = null
			closeAllPopups();
			showLocalInfo('You have been logged out with impeccable style!');
		} else {
			const data = await response.json();
			showLocalError(`Error during logout: ${data.message}`);
		}
	} catch (error) {
		console.error('Logout error:', error);
		showLocalError('An error occurred during logout. Do try again, old chap!');
	}
}

const recentIndices: number[] = [];
const MAX_RECENT = 40;
const TOTAL_GIFS = 53;
const MAX_ATTEMPTS = 100;
function getRandomIndexExcludingRecent(): number {
	let candidate: number;
	let attempts = 0;
	do {
		candidate = Math.floor(Math.random() * TOTAL_GIFS);
		attempts++;
		if (attempts > MAX_ATTEMPTS) break;
	} while (recentIndices.includes(candidate));

	recentIndices.push(candidate);
	if (recentIndices.length > MAX_RECENT) {
		recentIndices.shift();
	}
	return candidate;
}
function setRandomBgPicture(): void {
	const tvScreenInner = document.getElementById('background-image');
	if (tvScreenInner) {
		const randomIndex = getRandomIndexExcludingRecent();
		tvScreenInner.setAttribute(
			'src',
			`/static/assets/backgrounds/gifs/${randomIndex}.gif`
		);
	}
}
setRandomBgPicture();
document.addEventListener('keydown', (event) => {
	if (
		event.key === 'g' ||
		event.key === 'G' ||
		event.key === 'b' ||
		event.key === 'B'
	) {
		setRandomBgPicture();
	}
});

window.logout = logout;
window.fetchNumber = fetchNumber;
window.updateNumber = updateNumber;
window.createGame = createGame;
