// ----- Closing Buttons -----

const popupContainer: HTMLElement | null = document.getElementById('popup-container');
if (!popupContainer) console.error('popup-container not found');

function updateCloseAllVisibility(): void {
	const closeAllBtn = document.getElementById('close-all-popups-btn');
	if (!closeAllBtn) return;
	const popups = document.querySelectorAll('.popup');
	closeAllBtn.style.display = popups.length > 0 ? 'block' : 'none';
}

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
	let token: string | undefined = getCookie('token');

	notifyEventSource = new EventSource(`/notify?token=${token}`);

	notifyEventSource.onerror = (event) => {
		console.error('notifyEventSource.onerror', event);
		notifyEventSource?.close();
		notifyEventSource = null;
	};
	notifyEventSource.onopen = () => {
		console.log('EventSource connection established');
	};
	notifyEventSource.onmessage = (event) => {
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


function testCallback() {
	console.log('TEST! TEST! beep boop beep!');
}
