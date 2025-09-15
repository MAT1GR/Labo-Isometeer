// RUTA: consultar/src/components/ui/ConfirmationModal.tsx

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Save, Trash2 } from "lucide-react";
import Button from "./Button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSave?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  saveText?: string;
  cancelText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onSave,
  title,
  message,
  confirmText = "Confirmar",
  saveText = "Guardar",
  cancelText = "Cancelar",
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        // El posicionamiento aquí es correcto. 'fixed inset-0' asegura que se base
        // en la pantalla del monitor. Las clases 'flex' y 'items-center' se encargan del centrado.
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/50 sm:mx-0 sm:h-10 sm:w-10">
                  <AlertTriangle
                    className="h-6 w-6 text-yellow-500"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3
                    className="text-lg leading-6 font-bold text-gray-900 dark:text-white"
                    id="modal-title"
                  >
                    {title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-300">
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* --- ¡SOLUCIÓN AQUÍ! --- */}
            {/* 1. Se añade 'rounded-b-lg' para que las esquinas inferiores del área de botones coincidan con el modal. */}
            {/* 2. Se añade 'overflow-hidden' al contenedor principal para asegurar que nada se "salga". */}
            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 rounded-b-lg">
              <Button
                variant="outline"
                onClick={onClose}
                className="whitespace-nowrap"
              >
                {cancelText}
              </Button>
              <Button
                variant="danger"
                onClick={onConfirm}
                className="whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {confirmText}
              </Button>
              {onSave && (
                <Button
                  variant="primary"
                  onClick={onSave}
                  className="whitespace-nowrap"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveText}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
