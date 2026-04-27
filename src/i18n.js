import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import fr from "./locales/fr.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "fr"],
    // navigator.language in Tauri's WebView reflects the OS locale.
    // No localStorage caching — Tauri settings is the single source of truth
    // for explicit language preferences; "auto" falls back to navigator.
    detection: {
      order: ["navigator"],
      cacheUserLanguage: false,
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
