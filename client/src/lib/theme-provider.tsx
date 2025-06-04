import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

// Create a single file export for both the provider and hook
const ThemeProviderExport = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>("light");
  
  // Initialize theme on client-side only
  useEffect(() => {
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      return;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    // Apply theme change with EXACT color codes as specified
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light-theme-styles");
      document.documentElement.style.backgroundColor = '#121212';
      document.body.style.backgroundColor = '#121212';
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light-theme-styles");
      document.documentElement.style.backgroundColor = '#E0E2E3';
      document.body.style.backgroundColor = '#E0E2E3';
    }
    
    // Save preference to localStorage
    localStorage.setItem("theme", theme);
    
    // This event helps any component listening for theme changes
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Use a custom hook to consume the theme context
const useThemeExport = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Theme toggle component
const ThemeToggleExport = () => {
  const { theme, setTheme } = useThemeExport();
  
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="w-9 h-9 rounded-md"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

// Export the components (using named exports is React Fast Refresh compatible)
export const ThemeProvider = ThemeProviderExport;
export const useTheme = useThemeExport;
export const ThemeToggle = ThemeToggleExport;
