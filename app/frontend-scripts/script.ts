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

let serverValue = 0;
let lastServerValue = 0;
let displayValue = 0;
let localDelta = 0;
let pollId: number | null = null;
let pollingPaused = false;
let animId: number | null = null;

function setDisplay(v: number) {
	const el = document.getElementById('numberDisplay');
	if (el) el.textContent = Math.trunc(v).toString();
}

function animateTo(target: number, duration = 1000) {
	if (animId !== null) cancelAnimationFrame(animId);
	const start = performance.now();
	const from = displayValue;
	const delta = target - from;
	function step(t: number) {
		const p = Math.min(1, (t - start) / duration);
		displayValue = from + delta * p;
		setDisplay(displayValue);
		if (p < 1) animId = requestAnimationFrame(step);
	}
	animId = requestAnimationFrame(step);
}

function startPolling() {
	if (pollId !== null) clearInterval(pollId);
	pollId = window.setInterval(fetchNumber, 3000);
}

function pausePolling() {
	if (pollId !== null) {
		clearInterval(pollId);
		pollId = null;
	}
	pollingPaused = true;
}

async function fetchNumber(): Promise<void> {
	if (pollingPaused) return;
	try {
		const response = await fetch('/number');
		if (!response.ok) throw new Error('bad status');
		const data = await response.json();
		serverValue = Number(data.number) || 0;
		const appliedByServer = serverValue - lastServerValue;
		if (appliedByServer !== 0) {
			localDelta = Math.max(0, localDelta - appliedByServer);
			lastServerValue = serverValue;
		}
		animateTo(serverValue + localDelta, 1000);
	} catch {
		pausePolling();
	}
}

async function updateNumber(increment: number): Promise<void> {
	try {
		localDelta += increment;
		displayValue += increment;
		setDisplay(displayValue);
		const response = await fetch('/number', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ number: increment }),
		});
		if (!response.ok) {
			localDelta -= increment;
			pausePolling();
			return;
		}
	} catch {
		localDelta -= increment;
		pausePolling();
	}
}

const numberDisplay = document.getElementById('numberDisplay');
if (numberDisplay && !numberDisplay.hasAttribute('data-listener-added')) {
	numberDisplay.addEventListener('click', () => {
		if (pollingPaused) {
			pollingPaused = false;
			fetchNumber();
			startPolling();
		}
		updateNumber(1);
	});
	numberDisplay.setAttribute('data-listener-added', 'true');
}

document.addEventListener('DOMContentLoaded', () => {
	const el = document.getElementById('numberDisplay');
	displayValue = el ? Number(el.textContent) || 0 : 0;
	setDisplay(displayValue);
	startPolling();
	fetchNumber();
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
window.fetchNumber = fetchNumber;
window.updateNumber = updateNumber;
window.createGame = createGame;
