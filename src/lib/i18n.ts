import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from '../locales/ko.json';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import de from '../locales/de.json';

const savedLanguage = localStorage.getItem('app-language') ||
  (navigator.language.startsWith('ko') ? 'ko' : 
   navigator.language.startsWith('ja') ? 'ja' :
   navigator.language.startsWith('de') ? 'de' : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
      ja: { translation: ja },
      de: { translation: de },
    },
    lng: savedLanguage,
    fallbackLng: 'ko',
    interpolation: {
      escapeValue: false,
    },
    initImmediate: false,
    react: {
      useSuspense: false,
    },
  });

export default i18n;
