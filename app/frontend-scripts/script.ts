import { showLocalError, showLocalInfo } from './alert.js';

declare global {
	interface Window {
		updateActiveMenu: (selectedPage: string) => void;
		loadPartialView: (page: string, pushState?: boolean, subroute?: string | null, isPartial?: boolean) => Promise<void>;
		updateMenu: () => Promise<void>;
		logout: () => Promise<void>;
		fetchNumber: () => Promise<void>;
		updateNumber: (increment: number) => Promise<void>;
		abortController: AbortController | null;
		notifyEventSource: EventSource | null;
		createGame: () => Promise<void>;
	}
}

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

export async function createGame()
{
	const res = await fetch('/api/games/create', {
		method: 'POST'
	});
	if (!res.ok) {
		const data = await res.json();
		showLocalError(`${data.error}`);
		return;
	}

	const data = await res.json();
	showLocalInfo(`${data.message} (${data.gameId})`);
	await loadPartialView('lobby_admin', true, null, true);
}

export async function leaveGame()
{
	const response = await fetch('/api/games/leave', {
		method: 'POST',
	});

	if (!response.ok) {
		showLocalError(`Failed to leave game: ${response.statusText}`);
		return;
	}

	window.sessionStorage.setItem('ingame', 'nope');
	showLocalInfo('You have left the game successfully.');
}

// the isPartial var can be set to false if for some reason you want to load a partial view from a different route than the base partial route
export async function loadPartialView(
	page: string,
	pushState = true,
	subroute: string | null = null,
	isPartial: boolean = true
): Promise<void> {
	const token = localStorage.getItem('token');
	const headers: Record<string, string> = { loadpartial: 'true' };
	if (token) headers.Authorization = `Bearer ${token}`;

	let url: string;
	if (isPartial)
		url = subroute
			? `/partial/pages/${page}/${subroute}`
			: `/partial/pages/${page}`;
	else url = subroute
			? `/${page}/${subroute}`
			: `${page}`;

	try {
		const response: Response = await fetch(url, {
			method: 'GET',
			headers: headers,
		});

		if (!response.ok)
		{
			const data = await response.json();
			throw new Error(data.error);
		}

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

		// TODO: find a good way to handle it when the user leaves a lobby or a game in any way
		// alert(`Page: '${page}' and subroute: '${subroute ? subroute : 'NOPE'}'`);
		// const ingameStatus = window.sessionStorage.getItem('ingame');
		// if (ingameStatus === 'lobby' && !url.startsWith('/api/games/run?gameId='))
		// {
		// 	alert('leaving game because out of lobby');
		// 	await leaveGame();
		// }
		// else if (window.sessionStorage.getItem('ingame') === 'game')
		// {
		// 	alert('leaving game out game itself');
		// 	import('./game.js').then(({ leaveWsGame }) => {
		// 		leaveWsGame();
		// 	}).catch((error) => {
		// 		console.error('Error importing leaveWsGame:', error);
		// 	});
		// }
	
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
	} catch (error) {
		if (error instanceof Error)
			showLocalError(error.message);
		else
		showLocalError(`Error fetching partial view: ${error}`);
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
			updateMenu();
			await loadPartialView('index');
			window.notifyEventSource?.close();
			window.notifyEventSource = null;
			showLocalInfo('You have been logged out with impeccable style!');
			window.sessionStorage.setItem('loggedIn', 'false');
		} else {
			const data = await response.json();
			showLocalError(`Error during logout: ${data.message}`);
		}
	} catch (error) {
		console.error('Logout error:', error);
		showLocalError(
			'An error occurred during logout. Do try again, old chap!'
		);
	}
}

const recentIndices: number[] = [];
const MAX_RECENT = 40;
const TOTAL_GIFS = 53;
const MAX_ATTEMPTS = 100;
function getRandomIndexExcludingRecent(): number {
	let candidate: number;
	let attempts = 0;
	do {
		candidate = Math.floor(Math.random() * TOTAL_GIFS);
		attempts++;
		if (attempts > MAX_ATTEMPTS) break;
	} while (recentIndices.includes(candidate));

	recentIndices.push(candidate);
	if (recentIndices.length > MAX_RECENT) {
		recentIndices.shift();
	}
	return candidate;
}
function setRandomBgPicture(): void {
	const tvScreenInner = document.getElementById('background-image');
	if (tvScreenInner) {
		const randomIndex = getRandomIndexExcludingRecent();
		tvScreenInner.setAttribute(
			'src',
			`/static/assets/backgrounds/gifs/${randomIndex}.gif`
		);
	}
}
setRandomBgPicture();
document.addEventListener('keydown', (event) => {
	if (
		event.key === 'g' ||
		event.key === 'G' ||
		event.key === 'b' ||
		event.key === 'B'
	) {
		setRandomBgPicture();
	}
});

window.updateActiveMenu = updateActiveMenu;
window.loadPartialView = loadPartialView;
window.updateMenu = updateMenu;
window.logout = logout;
window.fetchNumber = fetchNumber;
window.updateNumber = updateNumber;
window.createGame = createGame;
