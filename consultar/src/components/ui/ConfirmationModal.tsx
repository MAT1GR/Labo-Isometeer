// RUTA: consultar/src/components/ui/ConfirmationModal.tsx

import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Button from "./Button";
import { AlertTriangle, Save } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onSave?: () => void;
  saveText?: string;
  children?: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onSave,
  saveText = "Guardar y Salir",
  children, // Aseguramos que se reciba la prop
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 text-left align-left shadow-3xl transition-all">
                <div className="md:flex">
                  <div className="flex flex-shrink-0 items-center justify-center bg-red-500 p-6 md:p-0 md:w-1/3">
                    <AlertTriangle
                      className="h-48 w-48 text-white"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex-grow p-8">
                    <Dialog.Title
                      as="h3"
                      className="text-3xl font-bold leading-9 text-gray-900 dark:text-gray-100"
                    >
                      {title}
                    </Dialog.Title>
                    <div className="mt-4">
                      <p className="text-lg text-gray-600 dark:text-gray-300">
                        {message}
                      </p>
                      {children} {/* Renderizamos los elementos hijos aquí */}
                    </div>

                    <div className="mt-12 flex flex-col-reverse sm:flex-row sm:justify-left sm:space-x-4 space-y-4 space-y-reverse sm:space-y-0">
                      <Button
                        variant="outline"
                        onClick={onClose}
                        className="w-full justify-center sm:w-auto px-full py-2 text-base"
                      >
                        {cancelText}
                      </Button>
                      <Button
                        onClick={onConfirm}
                        variant="danger"
                        className="w-full justify-center sm:w-auto px-6 py-2 text-base"
                      >
                        {confirmText}
                      </Button>
                      {onSave && (
                        <Button
                          onClick={onSave}
                          variant="primary"
                          className="w-full justify-center sm:w-auto px-6 py-2 text-base"
                        >
                          {" "}
                          {saveText}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConfirmationModal;
