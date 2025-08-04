// RUTA: /cliente/src/components/ui/ExportOtModal.tsx

import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, FileText, Receipt, Tag } from "lucide-react";
import Button from "./Button";
import { WorkOrder } from "../../services/otService";
import {
  exportOtPdfWorkOrder,
  exportOtPdfRemito,
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
          <div className="fixed inset-0 bg-black bg-opacity-60" />
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
                <div className="flex justify-between items-start">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100"
                  >
                    Exportar Orden de Trabajo
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Seleccione el formato de PDF que desea generar para la OT{" "}
                    <strong>{otData.custom_id || `#${otData.id}`}</strong>.
                  </p>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={handleExportWorkOrder}
                  >
                    <FileText className="mr-3 h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-semibold">Orden de Trabajo</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Documento completo con detalles y precios.
                      </p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={handleExportRemito}
                  >
                    <Receipt className="mr-3 h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-semibold">Remito / Recibo</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Versión para el cliente sin información de precios.
                      </p>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                    disabled
                  >
                    <Tag className="mr-3 h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-400">Etiqueta</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Próximamente disponible.
                      </p>
                    </div>
                  </Button>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="secondary" onClick={onClose}>
                    Cerrar
                  </Button>
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
