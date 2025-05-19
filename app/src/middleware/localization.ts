import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';


i18next
	.use(Backend)
	.use(middleware.LanguageDetector)
	.init({
		fallbackLng: 'en',
		backend: {
		loadPath: 'app/locales/{{lng}}/translation.json'
		},
		detection: {
		order: ['querystring', 'cookie'],
		caches: false
		},
		nonExplicitSupportedLngs: true,
		preload: ['en', 'fr', 'de'],
});

export default i18next;
