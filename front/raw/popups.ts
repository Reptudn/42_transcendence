const popupContainer: HTMLElement | null = document.getElementById('popup-container');
if (!popupContainer) document.body.insertAdjacentHTML('beforeend', '<div id="popup-container"></div>');

function closeAllPopups(): void {
	const popups = document.querySelectorAll('.popup');
	popups.forEach((popup) => {
		popup.remove();
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
				const notif = JSON.parse(event.data);
				popupContainer.insertAdjacentHTML('beforeend', notif.html);
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
