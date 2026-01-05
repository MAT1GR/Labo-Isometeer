// RUTA: consultar/src/components/ui/UnsavedChangesWarning.tsx

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Save, XCircle } from "lucide-react";
import Button from "./Button"; // Se asume que tienes un componente Button

interface UnsavedChangesWarningProps {
  isDirty: boolean;
  onSave: () => void; // Función para guardar los cambios
  onDiscard: () => void; // Función para descartar y/o navegar
}

/**
 * Muestra una barra de advertencia visual y persistente en la parte inferior
 * de la pantalla cuando hay cambios sin guardar. También mantiene la advertencia
 * nativa del navegador si el usuario intenta cerrar la pestaña.
 */
const UnsavedChangesWarning: React.FC<UnsavedChangesWarningProps> = ({
  isDirty,
  onSave,
  onDiscard,
}) => {
  // --- Mantenemos la lógica original para la seguridad del navegador ---
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue =
          "Tienes cambios sin guardar. ¿Seguro que quieres salir?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  // --- Renderizamos el nuevo componente visual ---
  return (
    <AnimatePresence>
      {isDirty && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="container mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-2xl ring-1 ring-gray-200 dark:ring-gray-700">
              {/* Sección de Mensaje */}
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Cambios sin guardar
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Guarda tu progreso antes de salir de la página.
                  </p>
                </div>
              </div>

              {/* Sección de Botones */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={onDiscard}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Descartar
                </Button>
                <Button variant="primary" size="sm" onClick={onSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UnsavedChangesWarning;
