import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from '../locales/ko.json';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import de from '../locales/de.json';
import zh from '../locales/zh.json';

const savedLanguage = localStorage.getItem('app-language') ||
  (navigator.language.startsWith('ko') ? 'ko' : 
   navigator.language.startsWith('ja') ? 'ja' :
   navigator.language.startsWith('de') ? 'de' :
   navigator.language.startsWith('zh') ? 'zh' : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
      ja: { translation: ja },
      de: { translation: de },
      zh: { translation: zh },
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

document.documentElement.lang = savedLanguage;
i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
