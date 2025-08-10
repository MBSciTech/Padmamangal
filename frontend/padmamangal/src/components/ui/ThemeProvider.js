// src/components/ui/ThemeProvider.js
import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: "gradient", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("pm_theme") : null;
    return stored || "gradient"; // gradient | yosemite | exotic | orbit
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const clsList = document.body.classList;
    ["theme-gradient", "theme-yosemite", "theme-exotic", "theme-orbit"].forEach((c) => clsList.remove(c));
    clsList.add(`theme-${theme}`);
    localStorage.setItem("pm_theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

