import { useTheme } from "../features/theme/ThemeContext";

// Sun / moon icon button. `withLabel` renders it as a sidebar-style row.
export default function ThemeToggle({ withLabel = false, className = "" }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  const icon = isDark ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
  return (
    <button type="button" className={`${withLabel ? "social-nav" : "icon-button"} theme-toggle ${className}`} onClick={toggleTheme} aria-label={label} title={label}>
      {icon}
      {withLabel && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}
