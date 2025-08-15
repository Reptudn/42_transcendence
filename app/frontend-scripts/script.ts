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

let serverActual = 0;
let serverShown = 0;
let pendingDelta = 0;

let pollId: number | null = null;
let pollingPaused = false;

let rafId: number | null = null;
let tweenFrom = 0;
let tweenTo = 0;
let tweenStart = 0;
let tweenDur = 1000;

function setDisplay(v: number) {
	const el = document.getElementById('numberDisplay');
	if (el) el.textContent = Math.trunc(v).toString();
}

function setServerTarget(newVal: number) {
	tweenFrom = serverShown;
	tweenTo = newVal;
	tweenStart = performance.now();
}

function tick(now: number) {
	const p = Math.min(1, (now - tweenStart) / tweenDur);
	serverShown = tweenFrom + (tweenTo - tweenFrom) * p;
	setDisplay(serverShown + pendingDelta);
	rafId = requestAnimationFrame(tick);
}

function ensureTick() {
	if (rafId === null) rafId = requestAnimationFrame(tick);
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
		const prev = serverActual;
		serverActual = Number(data.number) || 0;
		const caught = serverActual - prev;
		if (caught > 0) pendingDelta = Math.max(0, pendingDelta - caught);
		setServerTarget(serverActual);
	} catch {
		pausePolling();
	}
}

async function updateNumber(increment: number): Promise<void> {
	try {
		pendingDelta += increment;
		setDisplay(serverShown + pendingDelta);
		const response = await fetch('/number', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ number: increment }),
		});
		if (!response.ok) {
			pendingDelta -= increment;
			pausePolling();
			return;
		}
	} catch {
		pendingDelta -= increment;
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
	const initial = el ? Number(el.textContent) || 0 : 0;
	serverActual = initial;
	serverShown = initial;
	tweenFrom = initial;
	tweenTo = initial;
	tweenStart = performance.now();
	ensureTick();
	startPolling();
	fetchNumber();
});

async function logout(): Promise<void> {
	try {
		const response = await fetch('/api/auth/logout', { method: 'POST' });
		if (response.ok) {
			updateMenu();
			await loadPartialView('index', true, null, true, true, true);
			window.localStorage.setItem('loggedIn', 'false');
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
