"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, type ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Restoration is already applied by next-themes; only later user changes animate.
    document.documentElement.dataset.themeTransitions = "ready";
    return () => {
      delete document.documentElement.dataset.themeTransitions;
    };
  }, []);

  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="freemancodz-v7-theme"
      themes={["dark", "light"]}
    >
      {children}
    </NextThemesProvider>
  );
}
