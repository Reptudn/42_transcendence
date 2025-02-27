
function updateActiveMenu(selectedPage: string): void {
	const menuButtons = document.querySelectorAll('nav button[data-page]');
	menuButtons.forEach((button) => {
		if (button.getAttribute('data-page') === selectedPage) {
			button.classList.add('active');
		} else {
			button.classList.remove('active');
		}
	});
}

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

  updateActiveMenu(page);
  
	if (pushState) {
		history.pushState({ page }, '', `/partial/${page}`);
	}
}
// history change event
window.addEventListener('popstate', (event: PopStateEvent) => {
	if (event.state && typeof event.state.page === 'string') {
		loadPartialView(event.state.page, false);
	}
});

async function updateMenu(): Promise<void> {
	try {
		let response: Response;
		const token = localStorage.getItem('token');
		if (token) {
			response = await fetch('/menu', {
				headers: {
					'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
				}
			});
		} else {
			response = await fetch(`/menu`);
		}

		const html = await response.text();
		const menuElement = document.getElementById('menu');
		if (menuElement) {
			menuElement.innerHTML = html;
		}
	} catch (error) {
		console.error('Menu fetch failed:', error);
	}
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
