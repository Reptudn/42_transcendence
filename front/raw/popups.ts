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

let notifyEventSource = new EventSource('/notify');

notifyEventSource.onerror = (event) => {
	console.error('notifyEventSource.onerror', event);
	setTimeout(() => {
		notifyEventSource.close();
		notifyEventSource = new EventSource('/notify');
	}, 5000);
};
notifyEventSource.onmessage = (event) => {
	try {
		const data = JSON.parse(event.data);

		if (data.type === "connected") {
			console.log("Connection with Server established");
		} else {
			if (popupContainer) {
				popupContainer.insertAdjacentHTML('beforeend', data.html);
				updateCloseAllVisibility();
			} else {
				console.error("❌ popup-container not found in DOM!");
				return;
			}
		}
	} catch (err) {
		console.error("Error parsing event data:", err);
	}
};

function testCallback() {
	console.log('TEST! TEST! beep boop beep!');
}
