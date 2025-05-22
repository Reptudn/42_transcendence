import {
	closeAllPopups,
	popupContainer,
	updateCloseAllVisibility,
} from './popup.js';
import { loadPartialView } from './script.js';

import { appendToChatBox } from './chat.js';

export let notifyEventSource: EventSource | null = null;

function setupEventSource() {
	notifyEventSource = new EventSource('/events');
	notifyEventSource.addEventListener('close', (event) => {
		console.info('notifyEventSource.close', event);
		notifyEventSource?.close();
		notifyEventSource = null;
	});
	notifyEventSource.onerror = (event) => {
		console.info('notifyEventSource.onerror', event);
		notifyEventSource?.close();
		notifyEventSource = null;
	};
	notifyEventSource.onopen = () => {
		console.log('EventSource connection established');
	};
	notifyEventSource.onmessage = (event) => {
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
						popupContainer.insertAdjacentHTML(
							'beforeend',
							data.html
						);
						updateCloseAllVisibility();
					} else {
						console.error('❌ popup-container not found in DOM!');
						return;
					}
					break;
				case 'game_request':
					console.log('👫 Game request received:', data);
					sendPopup(
						'Game Request',
						'You have been invited to play a game!',
						'blue',
						`acceptGameInvite(${data.gameId}, ${data.playerId})`,
						'Accept'
					);
					break;
				case 'game_admin_request':
					acceptGameInvite(data.gameId, data.playerId);
					break;
				case 'chat':
					appendToChatBox(JSON.parse(data.message));
					break;
				default:
					console.error('❌ Unknown event type:', data.type);
					console.log(data);
					break;
			}
		} catch (err) {
			console.error('Error parsing event data:', err);
		}
	};
}
setupEventSource();
// loop every 5 secs if notifyEventSource is null
setInterval(() => {
	if (!notifyEventSource) {
		console.log('Attempting to reconnect to EventSource...');
		setupEventSource();
	}
}, 5000);

function sendPopup(
	title: string,
	description = '',
	color = 'black',
	callback1 = '',
	buttonName1 = 'CLICK ME',
	callback2 = '',
	buttonName2 = 'CLICK ME 2'
) {
	fetch('/event/send', {
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
	})
		.then((response) => response.json())
		.then((data) => console.log('Popup sent:', data))
		.catch((error) => console.error('Error sending popup:', error));
}

export function testCallback() {
	console.log('TEST! TEST! beep boop beep!');
}

export function acceptGameInvite(gameId: number, playerId: number) {
	console.log(
		'Accepting game invite for gameId',
		gameId,
		'with playerId',
		playerId
	);
	loadPartialView(
		`game?gameId=${encodeURIComponent(
			gameId
		)}&playerId=${encodeURIComponent(playerId)}`
	);
}

declare global {
	interface Window {
		acceptGameInvite: (gameId: number, playerId: number) => void;
		notifyEventSource: EventSource | null;
	}
}

closeAllPopups();
window.notifyEventSource = notifyEventSource;
window.acceptGameInvite = acceptGameInvite;
