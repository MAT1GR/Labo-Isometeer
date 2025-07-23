// RUTA: /cliente/src/components/ui/ThemeToggle.tsx

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";
import Button from "./Button";

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      title={
        theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"
      }
      className="rounded-full w-10 h-10 p-0 dark:text-gray-300 dark:hover:bg-gray-700"
    >
      {theme === "light" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
};

export default ThemeToggle;
