import { showLocalError, showLocalInfo } from './alert.js';
import { notifyEventSource } from './events.js';
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
	if (!notifyEventSource || notifyEventSource.readyState !== EventSource.OPEN) {
		showLocalError('Cant create game when the Event source is not available');
		return;
	}
	const res = await fetch('/api/games/create', { method: 'POST' });
	if (!res.ok) {
		const data = await res.json();
		showLocalError(`${data.error}`);
		return;
	}
	const data = await res.json();
	showLocalInfo(`${data.message} (${data.gameId})`);
	await loadPartialView('lobby_admin', true, null, true);
}

// the Number
let number = 42;
let previousServerNumber = 42;

document.addEventListener('DOMContentLoaded', () => {
	const el = document.getElementById('numberDisplay');
	const updateNumberDisplay = () => {
		if (el) el.textContent = number.toString();
	};
	el?.addEventListener('click', () => {
		number++;
		updateNumberDisplay();
	});
	const syncNumber = async () => {
		try {
			const response = await fetch('/number', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ number: number - previousServerNumber }),
			});
			if (response.ok) {
				const data = await response.json();
				console.log('Number updated successfully:', data);
				number = data.number;
				previousServerNumber = data.number;
				updateNumberDisplay();
			} else {
				console.error('Error updating number:', response.statusText);
			}
		} catch (error) {
			console.error('Error fetching number:', error);
		}
	};

	void syncNumber();
	setInterval(syncNumber, 3000);
});

// Logout

async function logout(): Promise<void> {
	try {
		const response = await fetch('/api/auth/logout', { method: 'POST' });
		if (response.ok) {
			updateMenu();
			sessionStorage.setItem('chat_id', '1');
			window.localStorage.setItem('loggedIn', 'false');
			await loadPartialView('index', true, null, true, true, true);
			window.notifyEventSource?.close();
			window.notifyEventSource = null;
			closeAllPopups();
			showLocalInfo('You have been logged out with impeccable style!');
		} else {
			showLocalError('Failed to logout');
		}
	} catch {
		showLocalError('An error occurred during logout. Do try again, old chap!');
		await loadPartialView('index', true, null, true, true, true);
	}
}

// Background

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

// if (window.localStorage.getItem("loggedIn") === "true")
// 	window.localStorage.setItem("loggedIn", "false");

window.logout = logout;
window.createGame = createGame;
