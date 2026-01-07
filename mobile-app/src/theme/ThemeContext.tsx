import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorPalette, darkPalette, lightPalette } from './colors';
import { SyntaxColors, darkSyntaxColors, lightSyntaxColors } from './syntaxColors';

const THEME_STORAGE_KEY = '@aether/theme_mode';

interface ThemeContextType {
  isDarkMode: boolean;
  colors: ColorPalette;
  syntaxColors: SyntaxColors;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        }
      } catch (error) {
        console.warn('Failed to load theme preference:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Save theme preference when it changes
  const saveTheme = useCallback(async (isDark: boolean) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      saveTheme(newValue);
      return newValue;
    });
  }, [saveTheme]);

  const setTheme = useCallback((isDark: boolean) => {
    setIsDarkMode(isDark);
    saveTheme(isDark);
  }, [saveTheme]);

  // Memoize colors to prevent unnecessary re-renders
  const colors = useMemo(() =>
    isDarkMode ? darkPalette : lightPalette,
    [isDarkMode]
  );

  const syntaxColors = useMemo(() =>
    isDarkMode ? darkSyntaxColors : lightSyntaxColors,
    [isDarkMode]
  );

  const value = useMemo(() => ({
    isDarkMode,
    colors,
    syntaxColors,
    toggleTheme,
    setTheme,
  }), [isDarkMode, colors, syntaxColors, toggleTheme, setTheme]);

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Main hook for full theme access
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// Convenience hook for just colors (most common use case)
export function useColors() {
  const { colors } = useTheme();
  return colors;
}

// Convenience hook for syntax colors
export function useSyntaxColors() {
  const { syntaxColors } = useTheme();
  return syntaxColors;
}

export { ThemeContext };
