// ----- Closing Buttons -----

export let popupContainer: HTMLElement | null =
	document.getElementById('popup-container');
if (!popupContainer) console.error('popup-container not found');

let closeAllBtn = document.getElementById('close-all-popups-btn');
if (closeAllBtn) closeAllBtn.addEventListener('click', closeAllPopups);
else console.error('closeAllBtn not found');

export function initPopups()
{
	popupContainer = document.getElementById('popup-container');
	if (!popupContainer) console.error('popup-container not found');

	closeAllBtn = document.getElementById('close-all-popups-btn');
	if (closeAllBtn) closeAllBtn.addEventListener('click', closeAllPopups);
	else console.error('closeAllBtn not found');
}

export function updateCloseAllVisibility(): void {
	const closeAllBtn = document.getElementById('close-all-popups-btn');
	if (!closeAllBtn) return;
	const popups = document.querySelectorAll('.popup');
	closeAllBtn.style.display = popups.length > 0 ? 'block' : 'none';
}
updateCloseAllVisibility();

export function dismissPopup(closeElement: HTMLElement): void {
	const popup = closeElement.closest('.popup');
	if (popup) {
		popup.classList.add('animate-fadeOut');
		popup.addEventListener(
			'animationend',
			() => {
				popup.remove();
				updateCloseAllVisibility();
			},
			{ once: true }
		);
	}
}

export function closeAllPopups(): void {
	const popups = document.querySelectorAll('.popup');
	for (const popup of popups) {
		popup.classList.add('animate-fadeOut');
		popup.addEventListener(
			'animationend',
			() => {
				popup.remove();
				updateCloseAllVisibility();
			},
			{ once: true }
		);
	}
}

declare global {
	interface Window {
		updateCloseAllVisibility: () => void;
		dismissPopup: (closeElement: HTMLElement) => void;
		closeAllPopups: () => void;
		popupContainer: HTMLElement | null;
	}
}

window.updateCloseAllVisibility = updateCloseAllVisibility;
window.dismissPopup = dismissPopup;
window.closeAllPopups = closeAllPopups;
window.popupContainer = popupContainer;

closeAllPopups();