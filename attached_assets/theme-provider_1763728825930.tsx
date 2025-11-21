import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeType } from '../../lib/design/tokens';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemeProviderProps {
  children?: React.ReactNode;
  defaultTheme?: ThemeType;
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'dashboard' 
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeType>(defaultTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    // Remove previous theme classes if any (simplified for this demo)
    root.classList.remove('theme-widget', 'theme-dashboard');
    root.classList.add(`theme-${theme}`);
    
    // We can also set CSS variables here dynamically if needed, 
    // but for now we rely on Tailwind classes or specific styles
    if (theme === 'widget') {
      root.style.setProperty('--primary', '25 95% 53%');
      // ... map other tokens
    } else {
      root.style.setProperty('--primary', '220 90% 56%');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={theme === 'widget' ? 'font-sans text-text' : 'font-sans text-text'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};