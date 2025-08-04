import { showLocalError, showLocalInfo } from './alert.js';
import { initCanvas, updateGameState } from './gameRenderer.js';
import { loadPartialView, onUnloadPageAsync } from './navigator.js';

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId');

const wsUrl = `/api/games/connect?gameId=${gameId}`;
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
	console.log('WebSocket connection established');
	initCanvas();
	window.startRendering();
	showLocalInfo('Connected to game server');
};

ws.onerror = (error) => {
	console.error('WebSocket error:', error);
	showLocalError('Failed to connect to game server');
};

ws.onclose = (event) => {
	window.stopRendering();
	clearInterval(input_interval);
	console.log('WebSocket closed:', event.code, event.reason);

	// Handle different close codes from your backend
	switch (event.code) {
		case 1008: // Policy violation (your custom error codes)
			showLocalError(`Connection rejected: ${event.reason}`);
			loadPartialView('profile');
			break;

		case 1000: // Normal closure
			showLocalInfo('Connection to game closed!');
			loadPartialView('profile');
			break;
		case 1001: // Going away
			showLocalInfo('Server is shutting down!');
			loadPartialView('profile');
			break;

		// case 1006:
		// 	showLocalError('Connection lost unexpectedly. Trying to reconnect...');
		// 	setTimeout(() => {
		// 		window.location.reload(); // Simple reconnection strategy
		// 	}, 1000);
		// 	break;

		// default:
		//	// showLocalError('Connection closed unexpectedly');
		// 	loadPartialView('profile');
		// 	break;
	}
};

ws.onmessage = (event) => {
	try {
		console.log(event.data);
		const data = JSON.parse(event.data);
		if (data.type === 'state') {
			const state = document.getElementById('state');
			if (state) {
				state.innerHTML = JSON.stringify(data.state);
				updateGameState(
					data.state,
					data.state.meta.size_x,
					data.state.meta.size_y
				);
				const playersList = document.getElementById('playersList');
				if (!playersList) {
					return;
				}
				playersList.innerHTML = '';
				for (const player of data.state.players) {
					const playerItem = document.createElement('li');
					playerItem.className = 'glow-green';
					playerItem.innerHTML = `${
						player.displayName
					} the <span class="glow-red">${
						player.playerTitle
					}</span>(<span class="glow-blue">${player.lives} Lives${
						player.lives <= 0 ? ' - dead' : ''
					}) (${player.type})</span>`;
					playersList.appendChild(playerItem);
				}
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
		showLocalError(`Error parsing chat message: ${e}`);
	}
};

// INPUT

let userInputData = {
	leftPressed: false,
	rightPressed: false,
	lastSentDirection: 0
}

let localUserInputData = {
	leftPressed: false,
	rightPressed: false,
	lastSentDirection: 0
}

window.addEventListener(
	'keydown',
	(e) => {
		if (e.key === 'ArrowLeft') userInputData.leftPressed = true;
		if (e.key === 'ArrowRight') userInputData.rightPressed = true;
		if (e.key === 'a') localUserInputData.leftPressed = true
		if (e.key === 'd') localUserInputData.rightPressed = true;
	},
	{ signal: window.abortController?.signal }
);

window.addEventListener(
	'keyup',
	(e) => {
		if (e.key === 'ArrowLeft') userInputData.leftPressed = false;
		if (e.key === 'ArrowRight') userInputData.rightPressed = false;
		if (e.key === 'a') localUserInputData.leftPressed = false
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

export async function leaveWsGame(manual: boolean = false) {
	// const response = await fetch('/api/games/leave', {
	// 	method: 'POST',
	// });

	// if (!response.ok) {
	// 	showLocalError(`Failed to leave game: ${response.statusText}`);
	// 	return;
	// }

	// showLocalInfo('You have left the game successfully.');

	// if (game_over) return;

	if (ws.readyState === WebSocket.OPEN) ws.close(1000, 'Leaving game!');
	if (manual) loadPartialView('profile');
}

window.leaveWsGame = leaveWsGame;

onUnloadPageAsync(async () => {
	clearInterval(input_interval);
	window.stopRendering();
	await leaveWsGame();
});

declare global {
	interface Window {
		leaveWsGame: () => Promise<void>;
	}
}
