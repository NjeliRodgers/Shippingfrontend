import React, { createContext, useContext, useEffect } from 'react';

export type AppTheme = 'white';

interface ThemeContextType {
  theme: AppTheme;
  isOcean: false;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // The application uses a white canvas throughout. Ocean blue is reserved for
    // navigation, primary actions, and selected information cards.
    localStorage.setItem('bluecrest_theme', 'white');
    document.documentElement.classList.remove('theme-ocean');
    document.documentElement.classList.add('theme-white');
    document.documentElement.style.colorScheme = 'light';
    document.body.style.backgroundColor = '#f8fafc';
    document.body.style.color = '#0f172a';
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'white', isOcean: false }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
