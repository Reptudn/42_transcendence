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

function toggleDarkMode(): void {
	document.body.classList.toggle('dark');
	const isDarkMode: boolean = document.body.classList.contains('dark');
}

window.addEventListener('DOMContentLoaded', () => {
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    toggleDarkMode(prefersDarkScheme.matches);

    prefersDarkScheme.addEventListener('change', (event) => {
        toggleDarkMode(event.matches);
    });
});

function toggleDarkMode(isDarkMode: boolean): void {
    if (isDarkMode) {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }

    const darkModeToggle: HTMLElement | null = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
    } else {
        console.warn("Dark mode toggle element not found");
    }
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

// A quick demonstration: setting a cookie for the username.
setCookie('username', "urmom", 1);
