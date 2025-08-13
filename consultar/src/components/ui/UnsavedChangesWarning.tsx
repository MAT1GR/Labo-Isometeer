// RUTA: /consultar/src/components/ui/UnsavedChangesWarning.tsx

import React, { useEffect, useState } from "react";
import { useBlocker } from "react-router-dom";
import ConfirmationModal from "./ConfirmationModal";

interface UnsavedChangesWarningProps {
  isDirty: boolean;
}

const UnsavedChangesWarning: React.FC<UnsavedChangesWarningProps> = ({
  isDirty,
}) => {
  const [showModal, setShowModal] = useState(false);

  // Bloquea la navegación interna de React Router si hay cambios
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    // Maneja el cierre de pestaña o recarga de página
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue =
          "Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    // Muestra el modal cuando la navegación es bloqueada
    if (blocker.state === "blocked") {
      setShowModal(true);
    }
  }, [blocker.state]);

  const handleConfirm = () => {
    setShowModal(false);
    blocker.proceed?.(); // Permite la navegación
  };

  const handleClose = () => {
    setShowModal(false);
    blocker.reset?.(); // Cancela la navegación
  };

  return (
    <ConfirmationModal
      isOpen={showModal}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title="Salir sin guardar"
      message="Tienes cambios sin guardar. ¿Estás seguro de que quieres salir? Perderás la información no guardada."
      confirmText="Salir"
      cancelText="Permanecer"
    />
  );
};

export default UnsavedChangesWarning;
