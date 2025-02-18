// Import any necessary types here (if using a module system)

// Asynchronously loads a partial view, updating browser history if required.
async function loadPartialView(page: string, pushState: boolean = true): Promise<void> {
	const response: Response = await fetch(`/partial/${page}`);
	const html: string = await response.text();
	console.log(`Switching to page: ${page}`);

	// Ensure that the content element exists.
	const contentElement: HTMLElement | null = document.getElementById('content');
	if (contentElement) {
		contentElement.innerHTML = html;
	} else {
		console.warn("Content element not found");
	}

	loadPageScript(page);

	if (pushState) {
		history.pushState({ page }, '', `/${page}`);
	}
}

// Handles the browser's popstate event to allow back/forward navigation.
window.addEventListener('popstate', (event: PopStateEvent) => {
	// Type narrowing to ensure the state object is as expected.
	if (event.state && typeof event.state.page === 'string') {
		loadPartialView(event.state.page, false);
	}
});

// Variable to hold a reference to the currently loaded page script.
let pageScript: HTMLScriptElement | null = null;

// Loads a page-specific script, removing any previous instance if necessary.
function loadPageScript(page: string): void {
	// Remove the previously appended script, if it exists.
	if (pageScript) {
		document.body.removeChild(pageScript);
		pageScript = null;
	}

	// For the 'game' page, dynamically load the pong.js script.
	if (page === 'game') {
		const script: HTMLScriptElement = document.createElement('script');
		script.src = '/static/js/pong.js';
		script.defer = true;
		document.body.appendChild(script);
		pageScript = script;
	}
}

// Toggles dark mode and updates the toggle button's text.
function toggleDarkMode(): void {
	document.body.classList.toggle('dark');
	const isDarkMode: boolean = document.body.classList.contains('dark');

	// Check that the toggle element exists.
	const darkModeToggle: HTMLElement | null = document.getElementById('darkModeToggle');
	if (darkModeToggle) {
		darkModeToggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
	} else {
		console.warn("Dark mode toggle element not found");
	}
}

// Sets a cookie with a specified name, value, and expiration in days.
function setCookie(name: string, value: string, days: number): void {
	const date: Date = new Date();
	date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
	const expires: string = "expires=" + date.toUTCString();
	document.cookie = `${name}=${value};${expires};path=/`;
}

// Retrieves a cookie by name.
// Note: This is a stub function that you might wish to complete.
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
