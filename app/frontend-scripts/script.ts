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
		showLocalError(
			'Cant create game when the Event source is not available',
			undefined,
			5000
		);
		return;
	}
	const res = await fetch('/api/games/create', { method: 'POST' });
	if (!res.ok) {
		const data = await res.json();
		showLocalError(`${data.error}`, undefined, 5000);
		return;
	}
	const data = await res.json();
	showLocalInfo(`${data.message} (${data.gameId})`, undefined, 5000);
	await loadPartialView('lobby_admin', true, null, true);
}

// the Number

let number = 42;
let previousServerNumber = 42;
let displayNumber = number;
let displayNumberServerOffset = 0;
let inflight = false;
let pendingLocalDelta = 0;

document.addEventListener('DOMContentLoaded', () => {
	const el = document.getElementById('numberDisplay');
	const updateNumberDisplay = () => {
		if (el) el.textContent = displayNumber.toString();
	};
	updateNumberDisplay();

	el?.addEventListener('click', () => {
		number++;
		displayNumber++;
		updateNumberDisplay();
	});
	// after: full replacement of syncNumber
	const syncNumber = async () => {
		if (inflight) return;
		inflight = true;

		const basePrev = previousServerNumber;
		const localDelta = number - basePrev;
		pendingLocalDelta = localDelta;

		try {
			const response = await fetch('/number', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ number: localDelta }),
			});

			if (!response.ok) throw new Error(response.statusText);

			const data = await response.json();

			const serverDelta = data.number - basePrev;
			const othersDelta = Math.max(0, serverDelta - pendingLocalDelta);

			const extraLocalClicks = number - basePrev - pendingLocalDelta;

			displayNumberServerOffset += othersDelta;

			previousServerNumber = data.number;
			number = data.number + extraLocalClicks;

			pendingLocalDelta = 0;
			updateNumberDisplay();
		} catch (error) {
			console.error('Error updating number:', error);
		} finally {
			inflight = false;
		}
	};

	const otherPlayerClick = async () => {
		if (displayNumberServerOffset > 0) {
			displayNumber++;
			displayNumberServerOffset--;
			updateNumberDisplay();
		}
	};
	setInterval(otherPlayerClick, 100);

	void syncNumber();
	setInterval(syncNumber, 1000);
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
			showLocalInfo(
				'You have been logged out with impeccable style!',
				undefined,
				5000
			);
		} else {
			showLocalError('Failed to logout', undefined, 5000);
		}
	} catch {
		showLocalError(
			'An error occurred during logout. Do try again, old chap!',
			undefined,
			5000
		);
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
