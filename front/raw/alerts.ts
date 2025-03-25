// NOTE: this is for only local popup alerts and not server rendered ones

const popupContainer: HTMLElement | null =
	document.getElementById('popup-container');

function addLocalPopup(message: string, type: string) {
	if (!popupContainer) {
		console.error('popup-container not found');
		return;
	}

	const popup = document.createElement('div');
	popup.classList.add('popup');
	popup.addEventListener('click', (e) => {
		if (e.target instanceof HTMLElement) {
			dismissPopup(e.target);
		}
	});
	popup.innerHTML = message;

	switch (type) {
		case 'Alert':
			popup.style.backgroundColor = 'yellow';
			break;
		case 'Log':
			popup.style.backgroundColor = 'lightblue';
			break;
		case 'Info':
			popup.style.backgroundColor = 'lightgreen';
			break;
		case 'Error':
			popup.style.backgroundColor = 'pink';
			break;
		default:
			break;
	}

	popupContainer.insertAdjacentHTML('beforeend', popup.outerHTML);
	updateCloseAllVisibility();
}

export function localAlert(message: string) {
	addLocalPopup(message, 'Alert');
}

export function localLog(message: string) {
	addLocalPopup(message, 'Log');
	localLog(message);
}

export function localInfo(message: string) {
	addLocalPopup(message, 'Info');
	console.info(message);
}

export function localError(message: string) {
	addLocalPopup(message, 'Error');
	console.error(message);
}

console.log('alerts.ts loaded');

// FIXME: the ficking set interval doesnt want to fire even though its there

setInterval(() => {
	console.log('sending popup alerts');
	// localAlert('This is an alert');
	// localLog('This is a log');
	// localInfo('This is an info');
	// localError('This is an error');
}, 5000);
