import { showLocalError } from './alert.js';
import { setupEventSource } from './events.js';
import { initPopups } from './popup.js';

declare global {
	interface Window {
		updateActiveMenu: (selectedPage: string) => void;
		loadPartialView: (
			page: string,
			pushState?: boolean,
			subroute?: string | null,
			isPartial?: boolean
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
				console.error('[onUnloadPageAsync] Error in async abort handler:', err)
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
	isPartial: boolean = true
): Promise<void> {
	const token = localStorage.getItem('token');
	let whole_page = false;
	const headers: Record<string, string> = { loadpartial: 'true' };
	if (page.includes('?lng=')) {
		headers.loadpartial = 'false';
		whole_page = true;
	}
	if (token) headers.Authorization = `Bearer ${token}`;

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

		const skipReset =
			(last_page?.startsWith('/partial/pages/lobby') ||
				last_page?.startsWith('/partial/pages/lobby_admin') ||
				last_page?.startsWith('/api/games/join')) &&
			url.startsWith('/api/games/run');

		if (!skipReset) {
			console.log('[Navigator] Resetting abort controller');
			window.abortController = resetController();
		} else {
			console.log('[Navigator] Skipping controller reset between lobby and game view');
		}

		const html: string = await response.text();

		setupEventSource();

		if (whole_page) {
			// window.sessionStorage.setItem('tvAnimationPlayed', 'false');
			// window.localStorage.setItem('LoadingAnimationPlayed', 'false');
			replaceEntireDocument(html);
			initPopups();
			setupEventSource();
		} else {
			const contentElement: HTMLElement | null = document.getElementById('content');
			if (contentElement) {
				contentElement.innerHTML = html;
				await loadScripts(contentElement);
			} else {
				console.warn('Content element not found');
			}
		}

		updateActiveMenu(page);

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

		last_page = url;

	} catch (error) {
		if (error instanceof Error) showLocalError(error.message);
		else showLocalError(`Error fetching partial view: ${error}`);
	}
}

function replaceEntireDocument(htmlContent: string): void {
	// Parse the HTML to extract head and body content
	const parser = new DOMParser();
	const newDoc = parser.parseFromString(htmlContent, 'text/html');
	
	// Replace the entire document head
	const newHead = newDoc.head;
	const currentHead = document.head;
	
	// Clear current head (but preserve essential meta tags)
	const essentialTags = currentHead.querySelectorAll('meta[charset], meta[name="viewport"]');
	currentHead.innerHTML = '';
	
	// Re-add essential tags first
	essentialTags.forEach(tag => currentHead.appendChild(tag.cloneNode(true)));
	
	// Add all new head content
	Array.from(newHead.children).forEach(child => {
		// Skip duplicating essential tags
		if (child.tagName === 'META' && 
			(child.getAttribute('charset') || child.getAttribute('name') === 'viewport')) {
			return;
		}
		currentHead.appendChild(child.cloneNode(true));
	});
	
	// Replace the entire body
	const newBody = newDoc.body;
	document.body.innerHTML = newBody.innerHTML;
	
	// Copy body attributes
	Array.from(newBody.attributes).forEach(attr => {
		document.body.setAttribute(attr.name, attr.value);
	});
	
	// Load scripts in the new body
	loadScripts(document.body);
}

async function loadScripts(container: HTMLElement): Promise<void> {
	const scripts = container.querySelectorAll('script');
	if (scripts && scripts.length > 0) {
		for (const oldScript of scripts) {
			const newScript = document.createElement('script');
			newScript.noModule = false;
			newScript.async = true;
			newScript.defer = true;
			newScript.type = oldScript.type || 'text/javascript';
			console.log('Loading script:', oldScript);
			
			if (oldScript.src) {
				newScript.src = `${oldScript.src}?cb=${Date.now()}`;
			} else {
				newScript.text = oldScript.text;
			}

			container.appendChild(newScript);
			oldScript.remove();

			newScript.addEventListener(
				'load',
				() => {
					console.log('Script loaded:', newScript.src);
				},
				{
					signal: window.abortController?.signal,
				}
			);
			
			newScript.addEventListener(
				'error',
				(event) => {
					console.error('Script error:', newScript.src, event);
				},
				{
					signal: window.abortController?.signal,
				}
			);
		}
	}
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
		let response: Response;
		const token = localStorage.getItem('token');
		if (token) {
			response = await fetch('/partial/menu', {
				headers: {
					Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
				},
			});
		} else {
			response = await fetch('/partial/menu');
		}

		const html = await response.text();
		const menuElement = document.getElementById('menu');
		if (menuElement) {
			menuElement.innerHTML = html;
		}
	} catch (error) {
		showLocalError(`Menu fetch failed: ${error}`);
	}
}

window.updateActiveMenu = updateActiveMenu;
window.loadPartialView = loadPartialView;
window.updateMenu = updateMenu;
