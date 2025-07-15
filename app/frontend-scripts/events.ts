// import { updateGameSettings } from "./lobby.js";
import { showLocalError, showLocalInfo } from "./alert.js";
import { closeAllPopups, popupContainer, updateCloseAllVisibility } from "./popup.js";
import { loadPartialView } from "./script.js";

export let notifyEventSource: EventSource | null = null;

function setupEventSource() {

	if (window.sessionStorage.getItem('loggedIn') !== 'true') {
		// console.warn('EventSource not set up because user is not logged in');
		return;
	}

	notifyEventSource = new EventSource('/events');
	notifyEventSource.addEventListener('close', (event) => {
		console.info('notifyEventSource.close', event);
		notifyEventSource?.close();
		notifyEventSource = null;
		showLocalInfo("Server connection closed");
	});
	notifyEventSource.onerror = (event) => {
		console.info('notifyEventSource.onerror', event);
		notifyEventSource?.close();
		notifyEventSource = null;
		showLocalError("A server connection error occured!");
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
						popupContainer.insertAdjacentHTML('beforeend', data.html);
						updateCloseAllVisibility();
					} else {
						console.error('❌ popup-container not found in DOM!');
						return;
					}
					break;
				case 'game_invite':
					console.log('👫 Game invite received:', data);
					// await sendPopup(
					// 	'Game Invite',
					// 	'You have been invited to play a game!',
					// 	'blue',
					// 	`acceptGameInvite(${data.gameId})`,
					// 	'Accept'
					// );
					// TODO: make this a sendPopupCall with actual buttons
					showLocalInfo(`<button onclick="acceptGameInvite(${data.gameId})">You have been invited to a game! (ID: ${data.gameId})</button>`);
					break;
				case 'game_admin_request':
					acceptGameInvite(data.gameId);
					break;
				case 'game_settings_update': // includes settings and ready player updates
					import('./lobby.js').then(({ updateGameSettings }) => {
						console.log('Game settings updated:', data.html);
						updateGameSettings(data.html);
					}).catch((error) => {
						console.error('Error importing updateGameSettings:', error);
					});
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
 // setupEventSource();
// loop every 100 ms if notifyEventSource is null
setInterval(() => {
	if (!notifyEventSource) {
		// console.log('Attempting to connect to EventSource...');
		setupEventSource();
	}
}, window.sessionStorage.getItem('loggedIn') === 'true' ? 100 : 5000);

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
	})

	if (!res.ok) {
		const error = await res.json();
		showLocalError(`Failed to send popup: ${error.error}`);
		throw new Error(`Failed to send popup: ${error.error}`);
	}

	showLocalInfo(`Popup sent successfully!`);
}

export function testCallback() {
	console.log('TEST! TEST! beep boop beep!');
}

export async function acceptGameInvite(gameId: number) {
	console.log(
		'Accepting game invite for gameId',
		gameId
	);
	await loadPartialView('api', true, `games/join/${gameId}`, false);
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
