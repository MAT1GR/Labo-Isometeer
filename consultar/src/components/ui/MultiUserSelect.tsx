// RUTA: /cliente/src/components/ui/MultiUserSelect.tsx

import React, { useState, useMemo } from "react";
import { User } from "../../services/auth";
import { Popover, Transition } from "@headlessui/react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "../../lib/utils";
import Input from "./Input";

interface MultiUserSelectProps {
  users: User[];
  selectedUserIds: number[];
  onChange: (selectedIds: number[]) => void;
  disabled?: boolean;
}

const MultiUserSelect: React.FC<MultiUserSelectProps> = ({
  users,
  selectedUserIds,
  onChange,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const selectedUsers = useMemo(
    () => users.filter((user) => selectedUserIds.includes(user.id)),
    [users, selectedUserIds]
  );

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [users, searchTerm]
  );

  const handleSelect = (userId: number) => {
    const newSelectedIds = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId];
    onChange(newSelectedIds);
  };

  return (
    <Popover className="relative w-full">
      {({ open, close }) => (
        <>
          {/* ***** CAMBIO: Popover.Button ahora es un div para evitar anidamiento incorrecto ***** */}
          <Popover.Button
            as="div"
            role="button"
            tabIndex={0}
            disabled={disabled}
            className={cn(
              "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              "dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100",
              "disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-1 min-h-[24px]">
                {selectedUsers.length === 0 ? (
                  <span className="text-gray-400">Asignar a...</span>
                ) : (
                  selectedUsers.map((user) => (
                    <span
                      key={user.id}
                      className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full"
                    >
                      {user.name}
                      {!disabled && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Evita que el popover se cierre
                            handleSelect(user.id);
                          }}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>
              <ChevronDown
                className={`h-5 w-5 text-gray-400 transition-transform ${
                  open ? "transform rotate-180" : ""
                }`}
              />
            </div>
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
                  placeholder="Buscar usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="max-h-60 overflow-y-auto p-2">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSelect(user.id)}
                      className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        readOnly
                        checked={selectedUserIds.includes(user.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm">{user.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500">
                    No se encontraron usuarios.
                  </div>
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default MultiUserSelect;
