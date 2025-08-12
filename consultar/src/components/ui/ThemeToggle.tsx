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
      className="relative rounded-full p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
    >
      {theme === "light" ? (
        // === INICIO DEL CAMBIO ===
        <Sun className="h-4 w-4" />
      ) : (
        // === FIN DEL CAMBIO ===
        // === INICIO DEL CAMBIO ===
        <Moon className="h-4 w-4" />
        // === FIN DEL CAMBIO ===
      )}
    </Button>
  );
};

export default ThemeToggle;
