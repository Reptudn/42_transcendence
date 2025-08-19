import { popupContainer, updateCloseAllVisibility } from './popup.js';

declare const ejs: typeof import('ejs');

interface LocalAlertData {
	title: string;
	description: string;
	color: string;
	onclick?: string;
}

export function showLocalPopup(data: LocalAlertData, timeout?: number) {
	const template = `
    <div class="popup pointer-events-auto animate-slideIn alert alert-<%= color %>" onclick="<%= onclick %>" role="alert">
        <div class="flex-1">
            <strong class="font-bold mr-8"><%- title %></strong>
            <span class="block"><%- description %></span>
        </div>
        <span class="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onclick="dismissPopup(this)">
            <svg class="fill-current h-6 w-6 close-icon" role="button" xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20">
                <title>Close</title>
                <path
                    d="M14.348 5.652a.5.5 0 0 1 .708.708L11.707 10l3.35 3.35a.5.5 0 0 1-.708.708L11 10.707l-3.35 3.35a.5.5 0 0 1-.708-.708L10.293 10 6.943 6.65a.5.5 0 0 1 .708-.708L11 9.293l3.35-3.35z" />
            </svg>
        </span>
    </div>
    `;

	const popupElement = ejs.render(template, data);
	popupContainer?.insertAdjacentHTML('afterbegin', popupElement);
	updateCloseAllVisibility();

	if (timeout) {
		const popup = popupContainer?.firstElementChild;
		if (popup) {
			setTimeout(() => {
				popup.remove();
				updateCloseAllVisibility();
			}, timeout);
		}
	}
}

export function showLocalError(description: string, onclick?: string) {
	showLocalPopup({ title: 'Error', description, color: 'red', onclick });
}

export function showLocalInfo(description: string, onclick?: string) {
	showLocalPopup({ title: 'Info', description, color: 'yellow', onclick });
}

export function showLocalLog(description: string, onclick?: string) {
	showLocalPopup({ title: 'Log', description, color: 'green', onclick });
}
declare global {
	interface Window {
		showLocalPopup: (data: LocalAlertData) => void;
		showLocalError: (description: string, onclick?: string) => void;
		showLocalInfo: (description: string, onclick?: string) => void;
		showLocalLog: (description: string, onclick?: string) => void;
	}
}

window.showLocalPopup = showLocalPopup;
window.showLocalError = showLocalError;
window.showLocalInfo = showLocalInfo;
window.showLocalLog = showLocalLog;
