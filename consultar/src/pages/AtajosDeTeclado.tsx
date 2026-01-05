// RUTA: consultar/src/pages/AtajosDeTeclado.tsx

import React, { useState, useEffect, useCallback } from "react";
import { useTitle } from "../contexts/TitleContext";
import { getShortcuts, defaultShortcuts, Shortcuts } from "../config/shortcuts";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const AtajosDeTeclado: React.FC = () => {
  const { setTitle } = useTitle();
  const [shortcuts, setShortcuts] = useState<Shortcuts>(getShortcuts());

  useEffect(() => {
    setTitle("Atajos de Teclado");
  }, [setTitle]);
  
  const [editingAction, setEditingAction] = useState<string | null>(null);

  // Hook para detectar la combinación de teclas cuando se está editando un atajo
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!editingAction) return;

      e.preventDefault();
      const key = e.key.toLowerCase();
      let newKeys = "";

      if (e.ctrlKey) newKeys += "ctrl+";
      if (e.altKey) newKeys += "alt+";
      if (e.shiftKey) newKeys += "shift+";

      // Añade la tecla principal solo si no es una de las teclas modificadoras
      if (!["control", "alt", "shift", "meta"].includes(key)) {
        newKeys += key;
      }

      if (newKeys) {
        setShortcuts((prev) => ({
          ...prev,
          [editingAction]: { ...prev[editingAction], keys: newKeys },
        }));
      }
      setEditingAction(null); // Termina el modo de edición
    },
    [editingAction]
  );

  useEffect(() => {
    if (editingAction) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingAction, handleKeyDown]);

  const handleSaveChanges = () => {
    try {
      localStorage.setItem("keyboardShortcuts", JSON.stringify(shortcuts));
      alert(
        "Atajos guardados. Los cambios se aplicarán después de recargar la página."
      );
      window.location.reload(); // Recarga para que los hooks tomen los nuevos valores
    } catch (error) {
      alert("No se pudieron guardar los atajos.");
      console.error(error);
    }
  };

  const handleResetDefaults = () => {
    setShortcuts(defaultShortcuts);
    localStorage.removeItem("keyboardShortcuts");
    alert("Atajos restaurados a los valores por defecto.");
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-end items-center mb-6">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetDefaults}>
            Restaurar Valores
          </Button>
          <Button onClick={handleSaveChanges}>Guardar y Aplicar Cambios</Button>
        </div>
      </div>
      <Card>
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Haz clic en un atajo para ponerlo en modo de edición. Luego,
            presiona la combinación de teclas que deseas asignar.
          </p>
          <div className="space-y-4">
            {Object.entries(shortcuts).map(
              ([action, { keys, description }]) => (
                <div
                  key={action}
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="text-gray-800 dark:text-gray-200">
                    {description}
                  </span>
                  <button
                    onClick={() => setEditingAction(action)}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm px-3 py-1 rounded-md min-w-[150px] text-center"
                  >
                    {editingAction === action ? "Presiona una tecla..." : keys}
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AtajosDeTeclado;
