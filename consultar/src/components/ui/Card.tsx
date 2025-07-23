// RUTA: /cliente/src/components/ui/Card.tsx

import React from "react";
import { cn } from "../../utils/cn";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className, children }) => {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-6 shadow-sm transition-colors duration-300",
        "dark:bg-gray-800 dark:border-gray-700",
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;
