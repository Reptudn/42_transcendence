import { showLocalError, showLocalInfo } from './alert.js';
import { updateGameState } from './gameRenderer.js';
import { leaveGame, loadPartialView } from './script.js';

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId');

const wsUrl = `ws://localhost:3000/api/games/connect/${gameId}`; // TODO: make this url with env var
const ws = new WebSocket(wsUrl);

ws.onopen = () => {
	console.log('WebSocket connection established');
	showLocalInfo('Connected to game server');
};

ws.onerror = (error) => {
	console.error('WebSocket error:', error);
	showLocalError('Failed to connect to game server');
};

ws.onclose = (event) => {
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
			
		case 1006: // TODO: handle unexpected game disconnects
			showLocalError('Connection lost unexpectedly. Trying to reconnect...');
			setTimeout(() => {
				window.location.reload(); // Simple reconnection strategy
			}, 1000);
			break;
			
		default:
			showLocalError('Connection closed unexpectedly');
			loadPartialView('profile');
			break;
	}
};

ws.onmessage = (event) => {
	try {
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

ws.onerror = (error) => {
	showLocalError(`WebSocket error: ${error}`);
};

ws.onclose = () => {
	showLocalInfo('WebSocket closed');
	console.log("Websocket closed");
};

// INPUT

let leftPressed = false;
let rightPressed = false;
let lastSentDirection = 0;

window.addEventListener('keydown', (e) => {
	if (e.key === 'ArrowLeft')
		leftPressed = true;
	
	if (e.key === 'ArrowRight')
		rightPressed = true;
});

window.addEventListener('keyup', (e) => {
	if (e.key === 'ArrowLeft')
		leftPressed = false;
	if (e.key === 'ArrowRight')
		rightPressed = false;
});

setInterval(() => {
	if (leftPressed && !rightPressed) {
		if (lastSentDirection !== -1) {
			ws.send(JSON.stringify({ type: 'move', dir: -1 }));
		}
		lastSentDirection = -1;
	} else if (rightPressed && !leftPressed) {
		if (lastSentDirection !== 1) {
			ws.send(JSON.stringify({ type: 'move', dir: 1 }));
		}
		lastSentDirection = 1;
	} else {
		if (lastSentDirection !== 0) {
			ws.send(JSON.stringify({ type: 'move', dir: 0 }));
		}
		lastSentDirection = 0;
	}
}, 1000 / 30); // 30 FPS

// This probably wont work because we never actually unload?
window.addEventListener('beforeunload', async () => {
	if (ws.readyState === WebSocket.OPEN) {
		ws.close(1000, 'Page unloading');
		await leaveGame();
	}
});