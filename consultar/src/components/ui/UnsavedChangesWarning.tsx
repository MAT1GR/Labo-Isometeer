// RUTA: consultar/src/components/ui/UnsavedChangesWarning.tsx

import React, { useEffect } from "react";

interface UnsavedChangesWarningProps {
  isDirty: boolean;
}

/**
 * Este componente no renderiza nada visible. Su única función es
 * mostrar un diálogo de advertencia nativo del navegador si el usuario
 * intenta salir de la página cuando hay cambios sin guardar (isDirty = true).
 */
const UnsavedChangesWarning: React.FC<UnsavedChangesWarningProps> = ({
  isDirty,
}) => {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Si el formulario tiene cambios, se activa la advertencia.
      if (isDirty) {
        // Previene la acción por defecto (como navegar o cerrar la pestaña).
        event.preventDefault();
        // Requerido por la mayoría de los navegadores para mostrar el diálogo.
        event.returnValue =
          "Tienes cambios sin guardar. ¿Seguro que quieres salir?";
      }
    };

    // Agrega el listener al montar el componente.
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Limpia el listener cuando el componente se desmonta (al cambiar de página).
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]); // Este efecto se ejecutará cada vez que el valor de 'isDirty' cambie.

  return null;
};

export default UnsavedChangesWarning;
