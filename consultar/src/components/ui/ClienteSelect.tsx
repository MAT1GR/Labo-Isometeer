// RUTA: /consultar/src/components/ui/ClienteSelect.tsx

import React, { useState, useMemo, forwardRef } from "react";
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

const ClienteSelect = forwardRef<HTMLButtonElement, ClienteSelectProps>(
  ({ clients, selectedClientId, onChange, disabled = false }, ref) => {
    const [searchTerm, setSearchTerm] = useState("");

    const selectedClient = useMemo(
      () => clients.find((client) => client.id === selectedClientId),
      [clients, selectedClientId]
    );

    const filteredClients = useMemo(
      () =>
        clients.filter(
          (client) =>
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.client_number &&
              client.client_number
                .toLowerCase()
                .includes(searchTerm.toLowerCase()))
        ),
      [clients, searchTerm]
    );

    const handleSelect = (clientId: number) => {
      onChange(clientId);
    };

    return (
      <div>
        <label className="text-sm font-medium dark:text-gray-300">
          Empresa (Nº Cliente) *
        </label>
        <Popover className="relative w-full mt-1">
          {({ open, close }) => (
            <>
              <Popover.Button
                ref={ref} // <-- Aquí se aplica la ref
                disabled={disabled}
                className={cn(
                  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left cursor-pointer",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                  "dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100",
                  "disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed flex items-center justify-between"
                )}
              >
                {selectedClient ? (
                  <span>
                    {selectedClient.name} ({selectedClient.code})
                  </span>
                ) : (
                  <span className="text-gray-400">Seleccionar cliente...</span>
                )}
                <ChevronDown
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    open ? "transform rotate-180" : ""
                  }`}
                />
              </Popover.Button>
              <Transition
                as={React.Fragment}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <Popover.Panel className="absolute z-10 mt-1 w-full rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="p-2">
                    <Input
                      type="text"
                      placeholder="Buscar por nombre, código o nº cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
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
                          <span>
                            {client.name} ({client.code})
                          </span>
                          {selectedClientId === client.id && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-gray-500">
                        No se encontraron clientes.
                      </div>
                    )}
                  </div>
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    );
  }
);

ClienteSelect.displayName = "ClienteSelect"; // <-- Buenas práctica para debugging

export default ClienteSelect;
