const popupContainer: HTMLElement | null = document.getElementById('popup-container');
if (!popupContainer) document.body.insertAdjacentHTML('beforeend', '<div id="popup-container"></div>');

function closeAllPopups(): void {
    console.log('closeAllPopups');
    const popups = document.querySelectorAll('.popup');
    popups.forEach((popup) => {
        popup.remove();
    });
}

let notifyEventSource = new EventSource('/notify');

interface NotificationEvent {
    html: string;
}

notifyEventSource.onerror = (event) => {
    console.error('notifyEventSource.onerror', event);
    // Attempt to reconnect after a delay
    setTimeout(() => {
        notifyEventSource.close();
        notifyEventSource = new EventSource('/notify');
    }, 5000);
};

notifyEventSource.onopen = () => {
    console.log('EventSource connection established');
};

document.addEventListener("notify-popup", (event) => {
    console.log("notify-popup event received", event);

    const popupContainer = document.getElementById("popup-container");
    if (!popupContainer) {
        console.error("❌ popup-container not found in DOM!");
        return;
    }

    const notif = JSON.parse((event as CustomEvent).detail) as NotificationEvent;
    popupContainer.innerHTML += notif.html;
});


notifyEventSource.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
            console.log("Server confirmed connection");
        } else {
            document.dispatchEvent(new CustomEvent("notify-popup", { detail: event.data }));
        }
    } catch (err) {
        console.error("Error parsing event data:", err);
    }
};

const closeAllBtn = document.getElementById('close-all-popups-btn');
if (closeAllBtn) closeAllBtn.addEventListener('click', closeAllPopups);
else console.error('closeAllBtn not found');

function testCallback() {
    console.log('callback from notification!');
}