// NOTE: this is for only local popup alerts and not server rendered ones
// import ejs from 'ejs';

declare const ejs: typeof import('ejs');

import { popupContainer, updateCloseAllVisibility } from './events';

interface LocalAlertData {
	title: string;
	description: string;
	color: string;
}

export function showLocalPopup(data: LocalAlertData) {
	console.log("local alert");
	const template = `
<div class="popup flex pointer-events-auto animate-slideIn bg-<%= color %>-100 border-l-4 border-<%= color %>-500 text-<%= color %>-700 px-4 py-3 rounded shadow-md relative"
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

	popupContainer?.insertAdjacentHTML('beforeend', ejs.render(template, data));
	updateCloseAllVisibility();
}

showLocalPopup({
	title: 'Local Alert',
	description: 'This is a local alert message.',
	color: 'blue',
});

declare global {
	interface Window {
		showLocalPopup: (data: LocalAlertData) => void;
	}
}

console.info("moin moin from alert.ts");