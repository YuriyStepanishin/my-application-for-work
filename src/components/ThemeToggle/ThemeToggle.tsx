import { useTheme } from '../../theme/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
        px-4 py-2
        rounded-lg
        bg-gray-200 dark:bg-gray-700
        text-black dark:text-white
      "
    >
      {theme === 'dark' ? '☀️ Світла' : '🌙 Темна'}
    </button>
  );
}
