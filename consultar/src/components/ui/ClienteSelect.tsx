// RUTA: consultar/src/components/ui/ClienteSelect.tsx

import React, { useState, useMemo, Fragment, useRef, useEffect } from "react";
import { Client } from "../../services/clientService";
import { Popover, Transition } from "@headlessui/react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import Input from "./Input";

interface ClienteSelectProps {
  clients: Client[];
  selectedClientId: number | undefined;
  onChange: (selectedId: number | undefined) => void;
  disabled?: boolean;
}

const ClienteSelect: React.FC<ClienteSelectProps> = ({
  clients,
  selectedClientId,
  onChange,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId]
  );

  const filteredClients = useMemo(
    () =>
      clients.filter(
        (client) =>
          client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client.code &&
            client.code.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [clients, searchTerm]
  );

  const handleSelect = (clientId: number) => {
    onChange(clientId);
  };

  return (
    <Popover as="div" className="relative w-full">
      {({ open, close }) => {
        // Usa useEffect para enfocar el input cuando el popover se abre
        useEffect(() => {
          if (open && inputRef.current) {
            inputRef.current.focus();
          }
        }, [open]);

        return (
          <>
            <label className="text-sm font-medium dark:text-gray-300">
              Empresa (Nº Cliente)
            </label>
            <Popover.Button
              disabled={disabled}
              className={cn(
                "w-full mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left cursor-pointer",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                "dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100",
                "disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed flex items-center justify-between"
              )}
            >
              <span className="truncate">
                {selectedClient ? (
                  <>
                    {selectedClient.name} ({selectedClient.code})
                  </>
                ) : (
                  <span className="text-gray-400">Seleccionar cliente...</span>
                )}
              </span>
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ${
                  open ? "transform rotate-180" : ""
                }`}
              />
            </Popover.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-1"
            >
              <Popover.Panel
                static
                className="absolute z-50 mt-1 w-full rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden"
              >
                <div className="p-2">
                  <Input
                    type="text"
                    placeholder="Buscar por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    ref={inputRef}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto p-2">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => {
                          handleSelect(client.id);
                          close();
                        }}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <span className="truncate">
                          {client.name} ({client.code})
                        </span>
                        {selectedClientId === client.id && (
                          <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      No se encontraron clientes.
                    </div>
                  )}
                </div>
              </Popover.Panel>
            </Transition>
          </>
        );
      }}
    </Popover>
  );
};

export default ClienteSelect;
