declare global {
	interface Window {
		setLanguageCookie: (lang: string) => void;
	}
}

export function setLanguageCookie(lang: string) {
	// alert("set lang to: " + lang);
	document.cookie = `i18next=${lang}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

window.setLanguageCookie = setLanguageCookie;

// only set it once and not every time this scritp gets loaded
if (!document.cookie.includes('i18next')) 
	setLanguageCookie('en');
