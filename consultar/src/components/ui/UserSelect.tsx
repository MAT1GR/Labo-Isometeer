// RUTA: /cliente/src/components/ui/UserSelect.tsx

import React, { useState, useMemo } from "react";
import { User } from "../../services/auth";
import { Popover, Transition } from "@headlessui/react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import Input from "./Input";

interface UserSelectProps {
  users: User[];
  selectedUserId: string;
  onChange: (selectedId: string) => void;
  disabled?: boolean;
  label: string;
}

const UserSelect: React.FC<UserSelectProps> = ({
  users,
  selectedUserId,
  onChange,
  disabled = false,
  label,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const selectedUser = useMemo(
    () => users.find((user) => user.id === Number(selectedUserId)),
    [users, selectedUserId]
  );

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [users, searchTerm]
  );

  const handleSelect = (userId: number) => {
    onChange(String(userId));
  };

  return (
    <div>
      <label className="text-sm font-medium dark:text-gray-300">{label}</label>
      <Popover className="relative w-full mt-1">
        {({ open, close }) => (
          <>
            <Popover.Button
              disabled={disabled}
              className={cn(
                "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left cursor-pointer",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                "dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100",
                "disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed flex items-center justify-between"
              )}
            >
              {selectedUser ? (
                <span>{selectedUser.name}</span>
              ) : (
                <span className="text-gray-400">Seleccionar...</span>
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
                        onClick={() => {
                          handleSelect(user.id);
                          close();
                        }}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <span>{user.name}</span>
                        {selectedUserId === String(user.id) && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
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
    </div>
  );
};

export default UserSelect;
