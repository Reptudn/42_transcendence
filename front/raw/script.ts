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
		const scriptSrcs = contentElement.querySelectorAll('[coolscript]');
		scriptSrcs.forEach((scriptSrc: Element) => {
			const script: HTMLScriptElement = document.createElement('script');
			script.src = scriptSrc.getAttribute('coolscript') || '';
			contentElement.appendChild(script);
		});
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
		console.log('Dark mode enabled');
		isDarkModeT = true;
    } else {
		document.body.classList.remove('dark');
		console.log('Dark mode disabled');
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
	console.log('Toggling dark mode to ' + isDarkModeT);
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
