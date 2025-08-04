import { showLocalInfo } from "./alert.js";
import { loadPartialView, last_page } from "./navigator.js";

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

	if (is_in_game)
	{
		const userConfirmed = confirm('If you change the language now you will get kicked out of the current game!');
		if (userConfirmed) {
			document.cookie = `i18next=${lang}; path=/; max-age=${60 * 60 * 24 * 30}`;
			console.log(`Language set to ${lang}`);
			await loadPartialView(`profile?lng=${lang}`, false);
		} else {
			console.log('Language change cancelled');
		}
	}
	else if (window.localStorage.getItem('loggedIn') === 'true') await loadPartialView(`profile?lng=${lang}`, false);
	else loadPartialView(`index?lng=${lang}`, false);
	showLocalInfo(`Changed language to:  ${lang.toUpperCase()}`);
}

window.setLanguageCookie = setLanguageCookie;

// only set it once and not every time this script gets loaded
if (!document.cookie.includes('i18next'))
	setLanguageCookie('en');
