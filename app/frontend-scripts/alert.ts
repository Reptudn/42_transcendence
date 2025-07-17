// NOTE: this is for only local popup alerts and not server rendered ones
// import ejs from 'ejs';

import { popupContainer, updateCloseAllVisibility } from './popup.js';

declare const ejs: typeof import('ejs');

interface LocalAlertData {
	title: string;
	description: string;
	color: string;
}

export function showLocalPopup(data: LocalAlertData) {
	const template = `
<div class="popup pointer-events-auto animate-slideIn bg-<%= color %>-100 border-l-4 border-<%= color %>-500 text-<%= color %>-700 px-4 py-3 rounded shadow-md"
	role="alert">
	<div class="flex-1">
		<strong class="font-bold mr-8"><%- title %></strong>
		<span class="block"><%- description %></span>
	</div>
	<span class="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onclick="dismissPopup(this)">
		<svg class="fill-current h-6 w-6 text-<%= color %>-500" role="button" xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 20 20">
			<title>Close</title>
			<path
				d="M14.348 5.652a.5.5 0 0 1 .708.708L11.707 10l3.35 3.35a.5.5 0 0 1-.708.708L11 10.707l-3.35 3.35a.5.5 0 0 1-.708-.708L10.293 10 6.943 6.65a.5.5 0 0 1 .708-.708L11 9.293l3.35-3.35z" />
		</svg>
	</span>
</div>
`;

// const template2 = `
// <div class="popup pointer-events-auto animate-slideIn bg-<%= color %>-100 border-l-4 border-${data.color}-500 text-${data.color}-700 px-4 py-3 rounded shadow-md"
// 	role="alert">
// 	<div class="flex-1">
// 		<strong class="font-bold mr-8">${data.title}</strong>
// 		<span class="block">${data.description}</span>
// 	</div>
// 	<span class="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer" onclick="dismissPopup(this)">
// 		<svg class="fill-current h-6 w-6 text-<%= color %>-500" role="button" xmlns="http://www.w3.org/2000/svg"
// 			viewBox="0 0 20 20">
// 			<title>Close</title>
// 			<path
// 				d="M14.348 5.652a.5.5 0 0 1 .708.708L11.707 10l3.35 3.35a.5.5 0 0 1-.708.708L11 10.707l-3.35 3.35a.5.5 0 0 1-.708-.708L10.293 10 6.943 6.65a.5.5 0 0 1 .708-.708L11 9.293l3.35-3.35z" />
// 		</svg>
// 	</span>
// </div>
// `;

	popupContainer?.insertAdjacentHTML('beforeend', ejs.render(template, data));
	// popupContainer?.insertAdjacentHTML('beforeend', template2);
	updateCloseAllVisibility();
}

export function showLocalError(description: string) {
	showLocalPopup({title: 'Error', description, color: 'red'});
}

export function showLocalInfo(description: string) {
	showLocalPopup({title: 'Info', description, color: 'yellow'});
}

export function showLocalLog(description: string) {
	showLocalPopup({title: 'Log', description, color: 'green'});
}

declare global {
	interface Window {
		showLocalPopup: (data: LocalAlertData) => void;
		showLocalError: (description: string) => void;
		showLocalInfo: (description: string) => void;
		showLocalLog: (description: string) => void;
	}
}

window.showLocalPopup = showLocalPopup;
window.showLocalError = showLocalError;
window.showLocalInfo = showLocalInfo;
window.showLocalLog = showLocalLog;