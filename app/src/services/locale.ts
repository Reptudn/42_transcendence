import lang_de from '../../locales/de.json';
import lang_en from '../../locales/en.json';
import lang_fr from '../../locales/fr.json';

export const languages: Map<string, Record<string, string>> = new Map();

languages.set('en', lang_en);
languages.set('de', lang_de);
languages.set('fr', lang_fr);

export const getLanguages = (lang: string): Record<string, string> =>
	languages.get(lang) || languages.get('en')!;
