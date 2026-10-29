import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function useThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const actionLabel =
    isMounted && theme === "light"
      ? "Switch to dark theme"
      : "Switch to light theme";

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return { actionLabel, isMounted, toggleTheme };
}
