import { showLocalError, showLocalInfo } from './alert.js';
import {
	initCanvas,
	stopRendering,
	updateGameState,
	getPlayerColor,
} from './gameRenderer.js';
import { loadPartialView, onUnloadPageAsync } from './navigator.js';

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId');

const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsHost = window.location.host;
const wsUrl = `${wsProtocol}//${wsHost}/api/games/connect?gameId=${gameId}`;
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
	console.log('WebSocket connection established');
	initCanvas();
	window.startRendering();
	showLocalInfo('Connected to game server');
};

ws.onerror = async (error) => {
	console.error('WebSocket error:', error);
	showLocalError('Failed to connect to game server', undefined, 5000);
	await loadPartialView('index');
};

ws.onclose = async (event) => {
	window.stopRendering();
	clearInterval(input_interval);
	console.log('WebSocket closed:', event.code, event.reason);

	// Handle different close codes from your backend
	switch (event.code) {
		case 1008: // Policy violation (your custom error codes)
			showLocalError(`Connection rejected: ${event.reason}`, undefined, 5000);
			await loadPartialView('profile');
			break;

		case 1000: // Normal closure
			showLocalInfo('Connection to game closed!');
			await loadPartialView('profile');
			break;

		case 1001: // Going away
			showLocalInfo('Server is shutting down!');
			await loadPartialView('profile');
			break;

		case 1005: // Invalid message format
			showLocalError(
				'Connection closed due to invalid message format or cloudflare issue',
				undefined,
				5000
			);
			await loadPartialView('profile');
			break;

		default:
			// Redirect to index for any unexpected disconnection
			await loadPartialView('profile');
			break;
	}
};

ws.onmessage = (event) => {
	try {
		const data = JSON.parse(event.data);
		if (data.type === 'state') {
			updateGameState(
				data.state,
				data.state.meta.size_x,
				data.state.meta.size_y
			);

			const infoBar = document.getElementById('playerInfoBar');
			if (infoBar) {
				infoBar.innerHTML = '';
				data.state.players.forEach((player: any, index: number) => {
					const idx = Number.isFinite(player?.playerNbr)
						? player.playerNbr
						: index;
					const c = getPlayerColor(idx);
					const item = document.createElement('div');
					item.className =
						'flex items-center gap-3 px-3 py-1 rounded border';
					item.style.borderColor = `rgb(${c.r}, ${c.g}, ${c.b})`;
					const dot = document.createElement('span');
					dot.className = 'inline-block w-3 h-3 rounded-full';
					dot.style.backgroundColor = `rgb(${c.r}, ${c.g}, ${c.b})`;
					const hearts = '❤️'.repeat(Math.max(0, player.lives || 0));
					const dead = (player.lives || 0) <= 0 ? ' — dead' : '';
					const text = document.createElement('span');
					text.textContent = `${player.displayName} — ${player.playerTitle} — ${player.type} — ${hearts}${dead}`;
					item.appendChild(dot);
					item.appendChild(text);
					infoBar.appendChild(item);
				});
			}
		} else if (data.type === 'change_lobby_settings') {
			const settings = document.getElementById('lobbySettings');
			if (settings) {
				settings.innerHTML = JSON.stringify(data.settings);
			}
		} else {
			showLocalInfo(`Unknown data received from websocket: ${data}`);
		}
	} catch (e) {
		showLocalError(`Error parsing chat message: ${e}`, undefined, 5000);
	}
};

// INPUT

const userInputData = {
	leftPressed: false,
	rightPressed: false,
	lastSentDirection: 0,
};

const localUserInputData = {
	leftPressed: false,
	rightPressed: false,
	lastSentDirection: 0,
};

window.addEventListener(
	'keydown',
	(e) => {
		if (e.key === 'ArrowLeft') userInputData.leftPressed = true;
		if (e.key === 'ArrowRight') userInputData.rightPressed = true;
		if (e.key === 'a') localUserInputData.leftPressed = true;
		if (e.key === 'd') localUserInputData.rightPressed = true;
	},
	{ signal: window.abortController?.signal }
);

window.addEventListener(
	'keyup',
	(e) => {
		if (e.key === 'ArrowLeft') userInputData.leftPressed = false;
		if (e.key === 'ArrowRight') userInputData.rightPressed = false;
		if (e.key === 'a') localUserInputData.leftPressed = false;
		if (e.key === 'd') localUserInputData.rightPressed = false;
	},
	{ signal: window.abortController?.signal }
);

const input_interval = setInterval(() => {
	// user
	if (userInputData.leftPressed && !userInputData.rightPressed) {
		if (userInputData.lastSentDirection !== -1) {
			ws.send(JSON.stringify({ type: 'move', dir: -1, user: 'user' }));
		}
		userInputData.lastSentDirection = -1;
	} else if (userInputData.rightPressed && !userInputData.leftPressed) {
		if (userInputData.lastSentDirection !== 1) {
			ws.send(JSON.stringify({ type: 'move', dir: 1, user: 'user' }));
		}
		userInputData.lastSentDirection = 1;
	} else {
		if (userInputData.lastSentDirection !== 0) {
			ws.send(JSON.stringify({ type: 'move', dir: 0, user: 'user' }));
		}
		userInputData.lastSentDirection = 0;
	}

	// local
	if (localUserInputData.leftPressed && !localUserInputData.rightPressed) {
		if (localUserInputData.lastSentDirection !== -1) {
			ws.send(JSON.stringify({ type: 'move', dir: -1, user: 'local' }));
		}
		localUserInputData.lastSentDirection = -1;
	} else if (localUserInputData.rightPressed && !localUserInputData.leftPressed) {
		if (localUserInputData.lastSentDirection !== 1) {
			ws.send(JSON.stringify({ type: 'move', dir: 1, user: 'local' }));
		}
		localUserInputData.lastSentDirection = 1;
	} else {
		if (localUserInputData.lastSentDirection !== 0) {
			ws.send(JSON.stringify({ type: 'move', dir: 0, user: 'local' }));
		}
		localUserInputData.lastSentDirection = 0;
	}
}, 1000 / 30); // 30 FPS

const pingInterval = setInterval(() => {
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({ type: 'ping' }));
	}
}, 30000);

let isClosing = false;
export async function leaveWsGame(manual: boolean = false) {
	if (isClosing) return;
	isClosing = true;

	if (ws && ws.readyState === WebSocket.OPEN) {
		try {
			ws.close(1000, 'Leaving game!');
		} catch (error) {
			console.error('Error closing WebSocket:', error);
		}
	}

	if (manual) {
		await loadPartialView('profile');
	}
}

window.leaveWsGame = leaveWsGame;

onUnloadPageAsync(async () => {
	clearInterval(input_interval);
	clearInterval(pingInterval);
	stopRendering();
	await leaveWsGame();
});

declare global {
	interface Window {
		leaveWsGame: () => Promise<void>;
	}
}
