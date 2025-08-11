// RUTA: /cliente/src/components/ui/ClienteFiltersModal.tsx

import React, { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Filter } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import { Client } from "../../services/clientService";

interface ClienteFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: Partial<Client>) => void;
  initialFilters: Partial<Client>;
}

const ClienteFiltersModal: React.FC<ClienteFiltersModalProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  initialFilters,
}) => {
  const [localFilters, setLocalFilters] = useState(initialFilters);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalFilters({ ...localFilters, [name]: value });
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({});
    onApplyFilters({});
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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center">
                  <Dialog.Title
                    as="h3"
                    className="text-xl font-bold leading-6 text-gray-900 dark:text-gray-100 flex items-center gap-2"
                  >
                    <Filter className="h-5 w-5" /> Filtros Avanzados
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

                <div className="mt-6 space-y-4">
                  <Input
                    label="ID Fiscal"
                    name="fiscal_id"
                    value={localFilters.fiscal_id || ""}
                    onChange={handleInputChange}
                    placeholder="Buscar por CUIT, DNI, etc."
                  />
                  <Input
                    label="Dirección"
                    name="address"
                    value={localFilters.address || ""}
                    onChange={handleInputChange}
                    placeholder="Buscar por calle, número..."
                  />
                  <Input
                    label="Localidad"
                    name="location"
                    value={localFilters.location || ""}
                    onChange={handleInputChange}
                    placeholder="Buscar por ciudad o localidad"
                  />
                  <Input
                    label="Provincia"
                    name="province"
                    value={localFilters.province || ""}
                    onChange={handleInputChange}
                    placeholder="Buscar por provincia"
                  />
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <Button variant="outline" onClick={handleClear}>
                    Limpiar Filtros
                  </Button>
                  <Button onClick={handleApply}>Aplicar Filtros</Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ClienteFiltersModal;
