// RUTA: /cliente/src/components/ui/ExportOtModal.tsx

import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, FileText, Receipt, Tag } from "lucide-react";
import Button from "./Button";
import { WorkOrder } from "../../services/otService";
import {
  exportOtPdfWorkOrder,
  exportOtPdfRemito,
  exportOtPdfEtiqueta, // Importamos la nueva función
} from "../../services/pdfGenerator";

interface ExportOtModalProps {
  isOpen: boolean;
  onClose: () => void;
  otData: WorkOrder | null;
}

const ExportOtModal: React.FC<ExportOtModalProps> = ({
  isOpen,
  onClose,
  otData,
}) => {
  if (!otData) return null;

  const handleExportWorkOrder = () => {
    exportOtPdfWorkOrder(otData);
    onClose();
  };

  const handleExportRemito = () => {
    exportOtPdfRemito(otData);
    onClose();
  };

  const handleExportEtiqueta = () => {
    exportOtPdfEtiqueta(otData);
    onClose();
  };

  const ExportOptionButton = ({
    icon: Icon,
    title,
    onClick,
    disabled = false,
    colorClass,
  }: {
    icon: React.ElementType;
    title: string;
    onClick?: () => void;
    disabled?: boolean;
    colorClass: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left p-4 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:border-blue-500 dark:hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-4"
    >
      <div
        className={`p-3 rounded-full bg-white dark:bg-gray-900 shadow-sm ${colorClass}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </p>
      </div>
    </button>
  );

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
          <div className="fixed inset-0 bg-black/60" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold leading-6 text-gray-900 dark:text-gray-100"
                  >
                    Exportar Orden de Trabajo
                  </Dialog.Title>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="!p-1 h-auto rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Seleccione el formato de PDF que desea generar para la OT{" "}
                    <strong className="text-blue-600 dark:text-blue-400">
                      {otData.custom_id || `#${otData.id}`}
                    </strong>
                    .
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <ExportOptionButton
                    icon={FileText}
                    title="Orden de Trabajo"
                    onClick={handleExportWorkOrder}
                    colorClass="text-blue-500"
                  />
                  <ExportOptionButton
                    icon={Receipt}
                    title="Remito / Recibo"
                    onClick={handleExportRemito}
                    colorClass="text-green-500"
                  />
                  <ExportOptionButton
                    icon={Tag}
                    title="Etiqueta"
                    onClick={handleExportEtiqueta}
                    colorClass="text-purple-500"
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ExportOtModal;
