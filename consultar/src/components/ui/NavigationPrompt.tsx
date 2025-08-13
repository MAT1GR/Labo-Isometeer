import React, { useState, useEffect } from "react";
import { useBlocker } from "react-router-dom";
import ConfirmationModal from "./ConfirmationModal";

interface NavigationPromptProps {
  when: boolean;
  onSave: () => void; // 1. Hacemos que la prop onSave sea obligatoria
}

const NavigationPrompt: React.FC<NavigationPromptProps> = ({
  when,
  onSave,
}) => {
  const [showModal, setShowModal] = useState(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (when) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [when]);

  useEffect(() => {
    if (blocker?.state === "blocked") {
      setShowModal(true);
    }
  }, [blocker]);

  if (blocker?.state !== "blocked") {
    return null;
  }

  const handleClose = () => {
    setShowModal(false);
    blocker.reset?.();
  };

  const handleConfirm = () => {
    setShowModal(false);
    blocker.proceed?.();
  };

  // 2. Nueva función que se ejecuta al hacer clic en "Guardar y Salir"
  const handleSaveAndExit = () => {
    // Primero, ejecuta la función de guardado que nos pasaron desde el formulario.
    onSave();

    // Cerramos el modal. La navegación procederá una vez que el guardado se complete
    // y la función `onSubmit` del formulario haga la redirección.
    setShowModal(false);
  };

  return (
    <ConfirmationModal
      isOpen={showModal}
      onClose={handleClose}
      onConfirm={handleConfirm}
      // --- Pasamos la nueva función al modal ---
      onSave={handleSaveAndExit}
      title="Salir sin guardar"
      message="Tienes cambios sin guardar. ¿Qué deseas hacer?"
      confirmText="Salir sin Guardar"
      saveText="Guardar y Salir"
      cancelText="Permanecer"
    />
  );
};

export default NavigationPrompt;
