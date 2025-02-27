let scriptContainer: HTMLDivElement | null = null;
let abortController: AbortController | null = null
let abortSignal: AbortSignal | null = null;
async function loadPartialView(page: string, pushState: boolean = true): Promise<void> {
	const response: Response = await fetch(`/partial/${page}`, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${localStorage.getItem('token')}`,
			'loadpartial': 'true'
		}
	});
	const html: string = await response.text();
	console.log(`Switching to page: ${page}`);

	const contentElement: HTMLElement | null = document.getElementById('content');
	if (contentElement) {

		contentElement.innerHTML = html;

		const scripts = contentElement.querySelectorAll('script');
		if (scripts && scripts.length > 0)
		{

			if (scriptContainer)
			{
				if (abortController) abortController.abort();
				scriptContainer.remove();
				scriptContainer = null;
				abortSignal = null;
				abortController = null;
			}

			abortController = new AbortController();
			abortSignal = abortController!.signal;

			scriptContainer = document.createElement('div');
			document.body.appendChild(scriptContainer);

			scripts.forEach(oldScript => {
				const newScript = document.createElement('script');
				newScript.type = oldScript.type || 'text/javascript';
				if (oldScript.src) {
					newScript.src = oldScript.src + '?cb=' + Date.now(); // refresh script, force cache break
				} else {
					newScript.textContent = oldScript.textContent;
				}
				scriptContainer!.appendChild(newScript);
			});
		}
	} else {
		console.warn("Content element not found");
	}

	if (pushState) {
		history.pushState({ page }, '', `/partial/${page}`);
	}
}

window.addEventListener('popstate', (event: PopStateEvent) => {
	if (event.state && typeof event.state.page === 'string') {
		loadPartialView(event.state.page, false);
	}
});

let isDarkModeT: boolean = false;
window.addEventListener('DOMContentLoaded', () => {
	const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
	toggleDarkMode(prefersDarkScheme.matches);
	isDarkModeT = prefersDarkScheme.matches;

	prefersDarkScheme.addEventListener('change', (event) => {
		toggleDarkMode(event.matches);
		isDarkModeT = event.matches;
	});
});

function toggleDarkMode(isDarkMode: boolean = isDarkModeT): void {
	if (isDarkMode) {
		document.body.classList.add('dark');
		isDarkModeT = true;
	} else {
		document.body.classList.remove('dark');
		isDarkModeT = false;
	}

	const darkModeToggle: HTMLElement | null = document.getElementById('darkModeToggle');
	if (darkModeToggle) {
		darkModeToggle.textContent = isDarkModeT ? 'Light Mode' : 'Dark Mode';
	} else {
		console.warn("Dark mode toggle element not found");
	}
}

function toggleDarkModeT(): void {
	isDarkModeT = !isDarkModeT;
	toggleDarkMode();
}

function setCookie(name: string, value: string, days: number): void {
	const date: Date = new Date();
	date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
	const expires: string = "expires=" + date.toUTCString();
	document.cookie = `${name}=${value};${expires};path=/`;
}

function getCookie(name: string): string | null {
	// A simple implementation might be:
	const nameEQ: string = name + "=";
	const ca: string[] = document.cookie.split(';');
	for (let c of ca) {
		c = c.trim();
		if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
	}
	return null;
}

// THE number
let numberFetchFailed: boolean = false;

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
		console.error('Error fetching number:', error);
	}
}
async function updateNumber(increment: number): Promise<void> {
	try {
		const response = await fetch('/number', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ number: increment })
		});
		const data = await response.json();
		const displayElement = document.getElementById('numberDisplay');
		if (displayElement) {
			displayElement.textContent = data.number.toString();
		}
	} catch (error) {
		console.error('Error updating number:', error);
	}
}
const numberDisplay = document.getElementById('numberDisplay');
if (numberDisplay) {
	numberDisplay.addEventListener('click', () => {
		updateNumber(1);
	});
}
setInterval(fetchNumber, 1000);
document.addEventListener('DOMContentLoaded', fetchNumber);
