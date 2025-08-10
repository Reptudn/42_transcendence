import { showLocalInfo } from './alert.js';
import { loadPartialView, last_page } from './navigator.js';

declare global {
	interface Window {
		setLanguageCookie: (lang: string) => Promise<void>;
	}
}

export async function setLanguageCookie(lang: string) {
	const is_in_game =
		last_page?.startsWith('/partial/pages/lobby') ||
		last_page?.startsWith('/partial/pages/lobby_admin') ||
		last_page?.startsWith('/api/games/join') ||
		last_page?.startsWith('/api/games/run');

	if (is_in_game) {
		const userConfirmed = confirm(
			'If you change the language now you will get kicked out of the current game!'
		);
		if (userConfirmed) {
			document.cookie = `i18next=${lang}; path=/; max-age=${
				60 * 60 * 24 * 30
			}`;
			console.log(`Language set to ${lang}`);
			await loadPartialView(`profile?lng=${lang}`, false);
		} else {
			console.log('Language change cancelled');
		}
	} else if (window.localStorage.getItem('loggedIn') === 'true') {
		document.cookie = `i18next=${lang}; path=/; max-age=${
			60 * 60 * 24 * 30
		}; samesite=lax`;
		await loadPartialView(`profile?lng=${lang}`, false);
	} else {
		document.cookie = `i18next=${lang}; path=/; max-age=${
			60 * 60 * 24 * 30
		}; samesite=lax`;
		loadPartialView(`index?lng=${lang}`, false);
	}

	showLocalInfo(`Changed language to:  ${lang.toUpperCase()}`);
}

window.setLanguageCookie = setLanguageCookie;

// only set it once and not every time this script gets loaded
function getCookie(name: string): string | null {
	const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
	return m ? decodeURIComponent(m[1]) : null;
}
if (!getCookie('i18next')) {
	document.cookie = `i18next=en; path=/; max-age=${
		60 * 60 * 24 * 30
	}; samesite=lax`;
}
