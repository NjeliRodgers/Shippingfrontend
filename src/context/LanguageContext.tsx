import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, Translations } from '../i18n/translations';
import { translateText } from '../i18n/text';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  tx: (text: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    let saved: Language | null = null;
    try {
      saved = localStorage.getItem('oceanroute_lang') as Language | null;
    } catch {
      saved = null;
    }
    return saved && translations[saved] ? saved : 'en';
  });

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    try {
      localStorage.setItem('oceanroute_lang', language);
    } catch {
      // Keep the selected language active for this page even if storage is unavailable.
    }
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = translations[language] || translations.en;
  const tx = (text: string) => translateText(text, language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, tx, dir }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
