import { loadPartialView } from './script';

export function setLanguage(lang: string): void {}

document
	.getElementById('languageSelect')
	?.addEventListener('change', (event) => {
		const target = event.target as HTMLSelectElement;
		const oldLanguage = localStorage.getItem('language') || 'en';
		if (target) {
			const selectedLanguage = target.value;
			localStorage.setItem('language', selectedLanguage);
			console.log(
				'(Set) Language set to:',
				localStorage.getItem('language')
			);
			const url = window.location.href;
			loadPartialView(url.replace(oldLanguage, selectedLanguage), true);
		}
	});

const language = localStorage.getItem('language') || 'en';
localStorage.setItem('language', language);
console.log('(Load) Language set to:', localStorage.getItem('language'));

const languageSelect = document.getElementById(
	'languageSelect'
) as HTMLSelectElement;

if (languageSelect) {
	languageSelect.value = language;
}

alert('language set to: ' + localStorage.getItem('language'));
