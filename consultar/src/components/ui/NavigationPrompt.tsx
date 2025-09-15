// RUTA: consultar/src/components/ui/NavigationPrompt.tsx

import React, { useState, useEffect } from "react";
import { useBlocker } from "react-router-dom";
import ConfirmationModal from "./ConfirmationModal";

interface NavigationPromptProps {
  when: boolean;
  onSave: () => void;
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

  const handleSaveAndExit = () => {
    onSave();
    setShowModal(false);
  };

  return (
    <ConfirmationModal
      isOpen={showModal}
      onClose={handleClose}
      onConfirm={handleConfirm}
      onSave={handleSaveAndExit}
      title="Salir sin guardar"
      message="Tienes cambios sin guardar. ¿Qué deseas hacer con tu progreso?"
      confirmText="Salir sin Guardar"
      saveText="Guardar y Salir"
      cancelText="Permanecer"
    />
  );
};

export default NavigationPrompt;
