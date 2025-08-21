// RUTA: /consultar/src/components/ui/Button.tsx

import React from "react";
import { cn } from "../../lib/utils"; // Asegúrate que la ruta a cn sea correcta

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // CORRECCIÓN: Se añade 'default' a las variantes posibles
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  // CORRECCIÓN: Se establece 'default' como la variante por defecto
  variant = "default",
  size = "md",
  className,
  children,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    // CORRECCIÓN: Se define el estilo para la nueva variante 'default'
    default: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary:
      "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700",
    ghost:
      "text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-700",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800",
  };

  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10",
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
