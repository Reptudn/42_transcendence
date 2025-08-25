import { showLocalError, showLocalInfo } from './alert.js';
import {
	initCanvas,
	stopRendering,
	updateGameState,
	getPlayerColor,
	startRendering,
} from './gameRenderer.js';
import { loadPartialView } from './navigator.js';
import { Script } from './script_manager.js';

let ws: WebSocket | null = null;
let input_interval: NodeJS.Timeout | null = null;
let pingInterval: NodeJS.Timeout | null = null;
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
let keyupHandler: ((e: KeyboardEvent) => void) | null = null;
let isClosing = false;

let userInputData = {
	leftPressed: false,
	rightPressed: false,
	lastSentDirection: 0,
};

let localUserInputData = {
	leftPressed: false,
	rightPressed: false,
	lastSentDirection: 0,
};

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

declare global {
	interface Window {
		leaveWsGame: () => Promise<void>;
	}
}

const game = new Script(
	async () => {
		console.log('[Game] Loading game script...');
		isClosing = false;

		console.log('[Game] Current URL:', window.location.href);
		console.log('[Game] Search params:', window.location.search);

		const urlParams = new URLSearchParams(window.location.search);
		const gameId = urlParams.get('gameId');

		if (!gameId) {
			showLocalError('No game ID provided');
			await loadPartialView('profile');
			return;
		}

		const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsHost = window.location.host;
		const wsUrl = `${wsProtocol}//${wsHost}/api/games/connect?gameId=${gameId}`;

		ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			console.log('WebSocket connection established');
			initCanvas();
			startRendering();
			showLocalInfo('Connected to game server');
		};

		ws.onerror = async (error) => {
			console.error('WebSocket error:', error);
			showLocalError('Failed to connect to game server');
			await loadPartialView('index');
		};

		ws.onclose = async (event) => {
			stopRendering();
			if (input_interval) {
				clearInterval(input_interval);
				input_interval = null;
			}
			console.log('WebSocket closed:', event.code, event.reason);

			switch (event.code) {
				case 1008:
					showLocalError(`Connection rejected: ${event.reason}`);
					await loadPartialView('profile');
					break;

				case 1000:
					showLocalInfo('Connection to game closed!');
					// await loadPartialView('profile');
					break;

				case 1001:
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
							const hearts = '❤️'.repeat(
								Math.max(0, player.lives || 0)
							);
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
				showLocalError(`Error parsing chat message: ${e}`);
			}
		};

		keydownHandler = (e) => {
			if (e.key === 'ArrowLeft') userInputData.leftPressed = true;
			if (e.key === 'ArrowRight') userInputData.rightPressed = true;
			if (e.key === 'a') localUserInputData.leftPressed = true;
			if (e.key === 'd') localUserInputData.rightPressed = true;
		};
		window.addEventListener('keydown', keydownHandler);

		keyupHandler = (e) => {
			if (e.key === 'ArrowLeft') userInputData.leftPressed = false;
			if (e.key === 'ArrowRight') userInputData.rightPressed = false;
			if (e.key === 'a') localUserInputData.leftPressed = false;
			if (e.key === 'd') localUserInputData.rightPressed = false;
		};
		window.addEventListener('keyup', keyupHandler);

		input_interval = setInterval(() => {
			if (!ws || ws.readyState !== WebSocket.OPEN) return;

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

			if (localUserInputData.leftPressed && !localUserInputData.rightPressed) {
				if (localUserInputData.lastSentDirection !== -1) {
					ws.send(
						JSON.stringify({ type: 'move', dir: -1, user: 'local' })
					);
				}
				localUserInputData.lastSentDirection = -1;
			} else if (
				localUserInputData.rightPressed &&
				!localUserInputData.leftPressed
			) {
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

		pingInterval = setInterval(() => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'ping' }));
			}
		}, 30000);

		window.leaveWsGame = leaveWsGame;

		console.log('[Game] Game script loaded successfully');
	},
	async () => {
		console.log('[Game] Unloading game script...');

		if (keydownHandler) {
			window.removeEventListener('keydown', keydownHandler);
			keydownHandler = null;
		}
		if (keyupHandler) {
			window.removeEventListener('keyup', keyupHandler);
			keyupHandler = null;
		}

		if (input_interval) {
			clearInterval(input_interval);
			input_interval = null;
		}
		if (pingInterval) {
			clearInterval(pingInterval);
			pingInterval = null;
		}

		stopRendering();

		// await leaveWsGame();

		userInputData = {
			leftPressed: false,
			rightPressed: false,
			lastSentDirection: 0,
		};
		localUserInputData = {
			leftPressed: false,
			rightPressed: false,
			lastSentDirection: 0,
		};

		delete (window as any).leaveWsGame;

		ws = null;
		isClosing = false;

		console.log('[Game] Game script unloaded successfully');
	}
);

export default game;
