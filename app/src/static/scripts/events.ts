// ----- Closing Buttons -----

const popupContainer: HTMLElement | null = document.getElementById('popup-container');
if (!popupContainer) console.error('popup-container not found');

function updateCloseAllVisibility(): void {
	const closeAllBtn = document.getElementById('close-all-popups-btn');
	if (!closeAllBtn) return;
	const popups = document.querySelectorAll('.popup');
	closeAllBtn.style.display = popups.length > 0 ? 'block' : 'none';
}
updateCloseAllVisibility();

function dismissPopup(closeElement: HTMLElement): void {
	const popup = closeElement.closest('.popup');
	if (popup) {
		popup.classList.add('animate-fadeOut');
		popup.addEventListener('animationend', () => {
			popup.remove();
			updateCloseAllVisibility();
		}, { once: true });
	}
}

function closeAllPopups(): void {
	const popups = document.querySelectorAll('.popup');
	popups.forEach((popup) => {
		popup.classList.add('animate-fadeOut');
		popup.addEventListener('animationend', () => {
			popup.remove();
			updateCloseAllVisibility();
		}, { once: true });
	});
}
const closeAllBtn = document.getElementById('close-all-popups-btn');
if (closeAllBtn) closeAllBtn.addEventListener('click', closeAllPopups);
else console.error('closeAllBtn not found');

// ----- EventSource -----

function getCookie(name: string) {
	const value = "; " + document.cookie;
	console.log("cookies: ", document.cookie);
	const parts = value.split("; " + name + "=");

	if (parts.length == 2) {
		const part = parts.pop();
		if (part) {
			return part.split(";").shift();
		}
		return undefined;
	}
}

let notifyEventSource: EventSource | null = null;
function setupEventSource() {
	notifyEventSource = new EventSource('/notify');

	notifyEventSource.onerror = (event) => {
		console.error('notifyEventSource.onerror', event);
		notifyEventSource?.close();
		notifyEventSource = null;
	};
	notifyEventSource.onopen = () => {
		console.log('EventSource connection established');
	};
	notifyEventSource.onmessage = (event) => {
		console.log('EventSource message received:', event);
		console.log('EventSource data:', event.data);
		try {
			const data = JSON.parse(event.data);

			if (data.type === "log") {
				console.log(data.message);
			} else if (data.type === "warning") {
				console.warn(data.message);
			} else if (data.type === "error") {
				console.error(data.message);
			} else if (data.type === "popup") {
				if (popupContainer) {
					popupContainer.insertAdjacentHTML('beforeend', data.html);
					updateCloseAllVisibility();
				} else {
					console.error("❌ popup-container not found in DOM!");
					return;
				}
			} else if (data.type === "game_request") {
				console.log("👫 Game request received:", data);
				sendPopup('Game Request', `You have been invited to play a game!`, 'blue', `acceptGameInvite(${data.gameId}, ${data.playerId})`, 'Accept');
			} else if (data.type === "game_admin_request") {
				acceptGameInvite(data.gameId, data.playerId);
			} else {
				console.error("❌ Unknown event type:", data.type);
				console.log(data);
			}
		} catch (err) {
			console.error("Error parsing event data:", err);
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
	description: string = '',
	color: string = 'black',
	callback1: string = '',
	buttonName1: string = 'CLICK ME',
	callback2: string = '',
	buttonName2: string = 'CLICK ME 2') {
	fetch('/notify/send', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ title, description, color, callback1, buttonName1, callback2, buttonName2 }),
	})
		.then((response) => response.json())
		.then((data) => console.log('Popup sent:', data))
		.catch((error) => console.error('Error sending popup:', error));
};

function testCallback() {
	console.log('TEST! TEST! beep boop beep!');
}

function acceptGameInvite(gameId: number, playerId: number) {
	console.log('Accepting game invite for gameId', gameId, 'with playerId', playerId);
	loadPartialView(`game?gameId=${encodeURIComponent(gameId)}&playerId=${encodeURIComponent(playerId)}`);
}