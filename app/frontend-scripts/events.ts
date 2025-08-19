import { showLocalError, showLocalInfo } from './alert.js';
import { loadPartialView } from './navigator.js';
import {
	closeAllPopups,
	popupContainer,
	updateCloseAllVisibility,
} from './popup.js';

export let notifyEventSource: EventSource | null = null;
export function closeEventSource() {
	if (!notifyEventSource) return;

	notifyEventSource.close();
	notifyEventSource = null;
}

function updateConnectionStatus(
	status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'
) {
	const statusElem = document.getElementById('connectedStatusSSE');
	if (statusElem) {
		switch (status) {
			case 'CONNECTING':
				statusElem.textContent = 'Connected: CONNECTING...';
				statusElem.style.color = 'orange';
				break;
			case 'CONNECTED':
				statusElem.textContent = 'Connected: TRUE';
				statusElem.style.color = 'green';
				break;
			case 'DISCONNECTED':
				statusElem.textContent = 'Connected: FALSE';
				statusElem.style.color = 'red';
				break;
		}
	}
}

const connectedStatusElem = document.getElementById('connectedStatusSSE');
if (connectedStatusElem) {
	updateConnectionStatus('DISCONNECTED');
}

let isConnecting = false;
export function setupEventSource() {
	if (window.localStorage.getItem('loggedIn') !== 'true') return;

	if (
		notifyEventSource &&
		(notifyEventSource.readyState === EventSource.OPEN ||
			notifyEventSource.readyState === EventSource.CONNECTING)
	) {
		return;
	}

	if (isConnecting) {
		console.log('Already attempting to connect...');
		return;
	}

	if (notifyEventSource) {
		notifyEventSource.close();
		notifyEventSource = null;
	}

	isConnecting = true;
	updateConnectionStatus('CONNECTING');
	notifyEventSource = new EventSource('/events');
	notifyEventSource.addEventListener('close', (event) => {
		console.info('notifyEventSource.close', event);
		isConnecting = false; // Reset connecting flag
		notifyEventSource?.close();
		notifyEventSource = null;
		updateConnectionStatus('DISCONNECTED');
		showLocalInfo('Server connection closed');
		setTimeout(() => {
			if (window.localStorage.getItem('loggedIn') === 'true') {
				setupEventSource();
			}
		}, 1000);
	});
	notifyEventSource.onerror = (event) => {
		console.info('notifyEventSource.onerror', event);
		isConnecting = false; // Reset connecting flag
		notifyEventSource?.close();
		notifyEventSource = null;
		updateConnectionStatus('DISCONNECTED'); // Fixed: was 'CONNECTED'
		setTimeout(() => {
			if (
				!notifyEventSource &&
				window.localStorage.getItem('loggedIn') === 'true'
			) {
				setupEventSource();
			}
		}, 2000);
	};
	notifyEventSource.onopen = () => {
		console.log('EventSource connection established');
		isConnecting = false;
		updateConnectionStatus('CONNECTED');
	};
	notifyEventSource.onmessage = async (event) => {
		// console.log('EventSource message received:', event);
		// console.log('EventSource data:', event.data);
		try {
			const data = JSON.parse(event.data);
			switch (data.type) {
				case 'log':
					console.log(data.message);
					break;
				case 'warning':
					console.warn(data.message);
					break;
				case 'error':
					console.error(data.message);
					break;
				case 'popup':
					if (popupContainer) {
						popupContainer.insertAdjacentHTML('afterbegin', data.html);
						updateCloseAllVisibility();
					} else {
						console.error('❌ popup-container not found in DOM!');
						return;
					}
					break;
				case 'game_invite':
					console.log('👫 Game invite received:', data);
					showLocalInfo(
						`You have been invited to a game! (ID: ${data.gameId})<br><button onclick="acceptGameInvite(${data.gameId})"class="ml-4 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors">Accept</button><button onclick="declineInvite(${data.gameId})"class="ml-4 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors">Decline</button>`
					);
					break;
				case 'lobby_admin_settings_update':
					import('./lobby_admin.js')
						.then(({ updatePage }) => {
							updatePage(data.html);
						})
						.catch((error) => {
							console.error(
								'Error importing updateGameSettings:',
								error
							);
						});
					break;
				case 'game_settings_update':
					import('./lobby.js')
						.then(({ updatePage }) => {
							updatePage(data.html);
						})
						.catch((error) => {
							console.error(
								'Error importing updateGameSettings:',
								error
							);
						});
					break;
				case 'game_started': {
					const gameId = data.message;
					showLocalInfo(`Game started! (ID: ${gameId})`);
					alert(`games/run?gameId=${gameId}`);
					await loadPartialView(
						'api',
						true,
						`games/run?gameId=${gameId}`,
						false,
						false
					);
					import('./gameRenderer.js').then(({ startRendering }) =>
						startRendering()
					);
					break;
				}
				case 'game_tournament_admin_lobby_warp': {
					console.log('Game tournament admin lobby warp:', data);
					await loadPartialView('lobby_admin', false, null, true, false);
					break;
				}
				case 'game_tournament_lobby_warp': {
					await loadPartialView(
						'api',
						true,
						`games/join/${data.gameId}/true`,
						false,
						false
					);
					break;
				}
				case 'game_closed':
					showLocalInfo(data.message);
					await loadPartialView('profile', true, null, true);
					break;
				case 'chat': {
					import('./chat.js').then(({ appendToChatBox }) => {
						appendToChatBox(data.message);
					});
					break;
				}
				case 'chat_update': {
					import('./chat.js').then(({ updateChat }) => {
						updateChat();
					});
					break;
				}
				default:
					console.error('❌ Unknown event type:', data.type);
					// console.log(data);
					break;
			}
		} catch (err) {
			console.error('Error parsing event data:', err);
		}
	};
}

if (localStorage.getItem('loggedIn') === 'true') {
	setupEventSource();
}

export async function sendPopup(
	title: string,
	description = '',
	color = 'black',
	callback1 = '',
	buttonName1 = 'CLICK ME',
	callback2 = '',
	buttonName2 = 'CLICK ME 2'
) {
	const res = await fetch('/events/send', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			title,
			description,
			color,
			callback1,
			buttonName1,
			callback2,
			buttonName2,
		}),
	});

	if (!res.ok) {
		const error = await res.json();
		showLocalError(`Failed to send popup: ${error.error}`);
		throw new Error(`Failed to send popup: ${error.error}`);
	}

	showLocalInfo('Popup sent successfully!');
}

export async function acceptGameInvite(gameId: number) {
	console.log('Accepting game invite for gameId', gameId);
	await loadPartialView('api', true, `games/join/${gameId}/true`, false, true);
	closeAllPopups();
}

export async function declineGameInvite(gameId: number) {
	console.log('Declining game invite for gameId', gameId);
	const res = await fetch(`/api/games/join/${gameId}/false`, {
		method: 'GET',
	});
	if (!res.ok) {
		const error = await res.json();
		showLocalError(`Failed to decline game invite: ${error.error}`);
		throw new Error(`Failed to decline game invite: ${error.error}`);
	}
	const data = await res.json();
	showLocalInfo(`${data.message}`);
	closeAllPopups();
}

declare global {
	interface Window {
		acceptGameInvite: (gameId: number, playerId: number) => Promise<void>;
		declineGameInvite: (gameId: number, playerId: number) => Promise<void>;
		notifyEventSource: EventSource | null;
		setupEventSource: () => void;
	}
}

closeAllPopups();
window.notifyEventSource = notifyEventSource;
window.acceptGameInvite = acceptGameInvite;
window.setupEventSource = setupEventSource;
