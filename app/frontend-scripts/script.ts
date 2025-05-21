import { showLocalError, showLocalInfo } from "./alert.js";

declare global {
	interface Window {
		updateActiveMenu: (selectedPage: string) => void;
		loadPartialView: (page: string, pushState?: boolean) => Promise<void>;
		updateMenu: () => Promise<void>;
		logout: () => Promise<void>;
		fetchNumber: () => Promise<void>;
		updateNumber: (increment: number) => Promise<void>;
		abortController: AbortController | null;
		notifyEventSource: EventSource | null;
	}
}

export function updateActiveMenu(selectedPage: string): void {
	const menuButtons = document.querySelectorAll('nav button[data-page]');
	for (const button of menuButtons) {
		if (button.getAttribute('data-page') === selectedPage) {
			button.classList.add('active');
		} else {
			button.classList.remove('active');
		}
	}
	document.head.title = `Transcendence: ${selectedPage}`;
}

export async function loadPartialView(
	page: string,
	pushState = true
): Promise<void> {
	const token = localStorage.getItem('token');
	const headers: Record<string, string> = { loadpartial: 'true' };
	if (token) headers.Authorization = `Bearer ${token}`;

	try {
		const response: Response = await fetch(`/partial/pages/${page}`, {
			method: 'GET',
			headers: headers,
		});
		const html: string = await response.text();

		const contentElement: HTMLElement | null =
			document.getElementById('content');
		if (contentElement) {
			contentElement.innerHTML = html;

			const scripts = contentElement.querySelectorAll('script');
			if (scripts && scripts.length > 0) {
				if (window.abortController) window.abortController.abort();
				window.abortController = new AbortController();

				for (const oldScript of scripts) {
					const newScript = document.createElement('script');
					newScript.noModule = false;
					newScript.async = true;
					newScript.defer = true;
					newScript.type = oldScript.type || 'text/javascript';
					console.log('Loading script:', oldScript);
					if (oldScript.src)
						newScript.src = `${oldScript.src}?cb=${Date.now()}`;
					// refresh script, force cache break
					else newScript.text = oldScript.text;

					contentElement.appendChild(newScript);

					oldScript.remove();

					newScript.addEventListener(
						'load',
						() => {
							console.log('Script loaded:', newScript.src);
						},
						{
							signal: window.abortController
								? window.abortController.signal
								: undefined,
						}
					);
					newScript.addEventListener(
						'error',
						(event) => {
							console.error(
								'Script error:',
								newScript.src,
								event
							);
						},
						{
							signal: window.abortController
								? window.abortController.signal
								: undefined,
						}
					);
				}
			}
		} else {
			console.warn('Content element not found');
		}

		updateActiveMenu(page);

		if (pushState) {
			console.info('pushing state');
			history.pushState({ page }, '', `/partial/pages/${page}`);
		}
	} catch (error) {
		console.error('Error fetching partial view:', error);
	}
}

// history change event
window.addEventListener('popstate', (event: PopStateEvent) => {
	if (event.state && typeof event.state.page === 'string') {
		loadPartialView(event.state.page, false);
	}
});

export async function updateMenu(): Promise<void> {
	try {
		let response: Response;
		const token = localStorage.getItem('token');
		if (token) {
			response = await fetch('/partial/menu', {
				headers: {
					Authorization: `Bearer ${
						localStorage.getItem('token') || ''
					}`,
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

// THE number
let numberFetchFailed = false;

async function fetchNumber(): Promise<void> {
	if (numberFetchFailed) {
		return;
	}
	try {
		const response = await fetch('/number');
		const data = await response.json();
		const displayElement = document.getElementById('numberDisplay');
		if (displayElement) {
			displayElement.textContent = data.number.toString();
		}
	} catch (error) {
		numberFetchFailed = true;
		showLocalError(`Error fetching number: ${error}`);
	}
}
async function updateNumber(increment: number): Promise<void> {
	try {
		const response = await fetch('/number', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ number: increment }),
		});
		if (!response.ok) return;
		const data = await response.json();
		const displayElement = document.getElementById('numberDisplay');
		if (displayElement) {
			displayElement.textContent = data.number.toString();
		}
	} catch (error) {
		showLocalError(`Error updating number: ${error}`);
	}
}
const numberDisplay = document.getElementById('numberDisplay');
if (numberDisplay && !numberDisplay.hasAttribute('data-listener-added')) {
	numberDisplay.addEventListener('click', () => {
		updateNumber(1);
	});
	numberDisplay.setAttribute('data-listener-added', 'true');
}
setInterval(fetchNumber, 100000);
document.addEventListener('DOMContentLoaded', fetchNumber);

async function logout(): Promise<void> {
	try {
		const response = await fetch('/api/auth/logout', { method: 'POST' });
		if (response.ok) {
			// Update your menu and load the home view
			updateMenu();
			loadPartialView('index');
			window.notifyEventSource?.close();
			window.notifyEventSource = null;
			showLocalInfo('You have been logged out with impeccable style!');
		} else {
			const data = await response.json();
			showLocalError(`Error during logout: ${data.message}`);
		}
	} catch (error) {
		console.error('Logout error:', error);
		showLocalError('An error occurred during logout. Do try again, old chap!');
	}
}

window.updateActiveMenu = updateActiveMenu;
window.loadPartialView = loadPartialView;
window.updateMenu = updateMenu;
window.logout = logout;
window.fetchNumber = fetchNumber;
window.updateNumber = updateNumber;
