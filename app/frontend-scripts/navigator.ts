import { showLocalError } from './alert.js';
import { setupEventSource } from './events.js';
import { login } from './login.js';
import { initPopups } from './popup.js';
import { ScriptManager } from './script_manager.js';
import { totp } from './totp.js';
import { register } from './register.js';
import add_friends from './add_friends.js';
// import friends from './friends.js';
import gameRenderer from './gameRenderer.js';
import { lobby } from './lobby.js';
import { lobby_admin } from './lobby_admin.js';
import game from './game.js';
import twofa_login_script from './twofa_login.js';
import edit_profile from './edit_profile.js';

declare global {
	interface Window {
		updateActiveMenu: (selectedPage: string) => void;
		loadPartialView: (
			page: string,
			pushState: boolean,
			subroute: string | null,
			isPartial: boolean,
			abort: boolean,
			whole_page: boolean
		) => Promise<void>;
		updateMenu: () => Promise<void>;
		abortController: AbortController | null;
	}
}

// page unloading logic
let controller: AbortController | null = null;

export function resetController(): AbortController {
	if (controller) controller.abort(); // cancel old listeners
	controller = new AbortController();
	return controller;
}

export function getSignal(): AbortSignal | null {
	return controller?.signal || null;
}

export function onUnloadPage(
	callback: () => void,
	options?: AddEventListenerOptions
) {
	const signal = getSignal();
	if (!signal) return;

	signal.addEventListener('abort', callback, {
		once: true,
		...(options || {}),
	});
}

export function onUnloadPageAsync(
	callback: () => Promise<void>,
	options?: AddEventListenerOptions
) {
	const signal = getSignal();
	if (!signal || signal.aborted) return;

	signal.addEventListener(
		'abort',
		() => {
			callback().catch((err) =>
				console.error(
					'[onUnloadPageAsync] Error in async abort handler:',
					err
				)
			);
		},
		{
			once: true,
			...(options || {}),
		}
	);
}

window.abortController = resetController();

// page loading logic
export function updateActiveMenu(selectedPage: string): void {
	const menuButtons = document.querySelectorAll('nav button[data-page]');
	for (const button of menuButtons) {
		if (button.getAttribute('data-page') === selectedPage) {
			button.classList.add('glow-blue');
		} else {
			button.classList.remove('glow-blue');
		}
	}
	document.head.title = `Transcendence: ${selectedPage}`;
}

export let last_page: string | undefined = undefined;
// the isPartial var can be set to false if for some reason you want to load a partial view from a different route than the base partial route
export async function loadPartialView(
	page: string,
	pushState = true,
	subroute: string | null = null,
	isPartial: boolean = true,
	abort: boolean = true,
	whole_page: boolean = false
): Promise<void> {
	const headers: Record<string, string> = { loadpartial: 'true' };
	if (whole_page) headers.loadpartial = 'false';

	let url: string;
	if (isPartial)
		url = subroute
			? `/partial/pages/${page}/${subroute}`
			: `/partial/pages/${page}`;
	else url = subroute ? `/${page}/${subroute}` : `${page}`;

	try {
		const response: Response = await fetch(url, {
			method: 'GET',
			headers: headers,
		});

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error);
		}

		if (pushState) {
			console.info('pushing state: ', url);
			history.pushState(
				{
					page: page,
					pushState: false,
					subroute: subroute ? subroute : null,
				},
				'',
				url
			);
		}

		if (abort) {
			console.log('[Navigator] Resetting abort controller');
			window.abortController = resetController();
		} else {
			console.log(
				'[Navigator] Skipping controller reset between lobby and game view'
			);
		}

		const html: string = await response.text();

		if (whole_page) {
			await replaceEntireDocument(html, abort);
			initPopups();
		} else {
			const contentElement: HTMLElement | null =
				document.getElementById('content');
			if (contentElement) {
				contentElement.innerHTML = html;
				await loadScripts(contentElement);
			} else {
				console.warn('Content element not found');
			}
		}
		setupEventSource();

		updateActiveMenu(page);

		last_page = url;
	} catch (error) {
		if (error instanceof Error) showLocalError(error.message, undefined, 5000);
		else
			showLocalError(`Error fetching partial view: ${error}`, undefined, 5000);
	}
}

async function replaceEntireDocument(
	htmlContent: string,
	abort: boolean
): Promise<void> {
	const parser = new DOMParser();
	const newDoc = parser.parseFromString(htmlContent, 'text/html');

	const newHead = newDoc.head;
	const currentHead = document.head;

	const essentialTags = currentHead.querySelectorAll(
		'meta[charset], meta[name="viewport"]'
	);
	currentHead.innerHTML = '';

	essentialTags.forEach((tag) => currentHead.appendChild(tag.cloneNode(true)));

	Array.from(newHead.children).forEach((child) => {
		if (
			child.tagName === 'META' &&
			(child.getAttribute('charset') ||
				child.getAttribute('name') === 'viewport')
		) {
			return;
		}
		currentHead.appendChild(child.cloneNode(true));
	});

	const newBody = newDoc.body;
	document.body.innerHTML = newBody.innerHTML;

	Array.from(newBody.attributes).forEach((attr) => {
		document.body.setAttribute(attr.name, attr.value);
	});

	await loadScripts(document.body);
}

async function loadScripts(container: HTMLElement): Promise<void> {
	// await scriptManager.unloadAll();
	const scriptConfig = container.querySelector('script-config');
	if (!scriptConfig) {
		await scriptManager.unloadAll();
		console.info(`[ScriptManager] No script config found... skipping!`);
		return;
	}

	const scriptsToLoad = scriptConfig.getAttribute('data-scripts');
	if (!scriptsToLoad) {
		await scriptManager.unloadAll();
		console.info(`[ScriptManager] No scripts to load...`);
		return;
	}

	const scripts = scriptsToLoad.split(',').map((s) => s.trim());
	if (scripts.length) await scriptManager.load(scripts as string[]);
	else await scriptManager.unloadAll();
}

// history change event
window.addEventListener('popstate', async (event: PopStateEvent) => {
	const state = event.state;
	if (event.state && typeof event.state.page === 'string') {
		await loadPartialView(
			state.page,
			false,
			state.subroute ? state.subroute : null
		);
	}
});

export async function updateMenu(): Promise<void> {
	try {
		let response: Response = await fetch('/partial/menu');

		const html = await response.text();
		const menuElement = document.getElementById('menu');
		if (menuElement) {
			menuElement.innerHTML = html;
		}
	} catch (error) {
		showLocalError(`Menu fetch failed: ${error}`, undefined, 5000);
	}
}

window.updateActiveMenu = updateActiveMenu;
window.loadPartialView = loadPartialView;
window.updateMenu = updateMenu;

const scriptManager = new ScriptManager();
scriptManager.registerScript('twofa_login', twofa_login_script);
scriptManager.registerScript('login', login);
scriptManager.registerScript('register', register);
scriptManager.registerScript('totp', totp);
scriptManager.registerScript('lobby', lobby);
scriptManager.registerScript('lobby_admin', lobby_admin);
scriptManager.registerScript('game', game);
scriptManager.registerScript('gameRenderer', gameRenderer);
// scriptManager.registerScript('friends', friends);
scriptManager.registerScript('add_friends', add_friends);
scriptManager.registerScript('edit_profile', edit_profile);
