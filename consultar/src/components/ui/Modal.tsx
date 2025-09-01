// RUTA: consultar/src/components/ui/Modal.tsx

import React from "react";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300 ease-in-out">
      <div
        className={cn(
          "relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl transition-all duration-300 ease-in-out dark:bg-gray-800",
          {
            "scale-95 opacity-0": !isOpen,
            "scale-100 opacity-100": isOpen,
          }
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-3 dark:border-gray-700">
          <h3 className="text-xl font-semibold dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-4 text-gray-700 dark:text-gray-300">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
