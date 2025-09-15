// RUTA: consultar/src/components/ui/MultiUserSelect.tsx

import React, { useState, useMemo, useRef, useEffect } from "react";
import { User } from "../../services/auth";
import { X, ChevronDown } from "lucide-react";

interface MultiUserSelectProps {
  users?: User[];
  selectedUserIds: number[];
  onChange: (selectedIds: number[]) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}

const MultiUserSelect: React.FC<MultiUserSelectProps> = ({
  users = [],
  selectedUserIds,
  onChange,
  onBlur,
  autoFocus,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Este listener ahora solo se preocupa de los clics que ocurren
    // verdaderamente fuera del área del componente.
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef, onBlur]);

  const availableUsers = useMemo(() => {
    return users.filter(
      (user) =>
        !selectedUserIds.includes(user.id) &&
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, selectedUserIds, searchTerm]);

  const selectedUsers = useMemo(() => {
    return users.filter((user) => selectedUserIds.includes(user.id));
  }, [users, selectedUserIds]);

  const handleSelect = (userId: number) => {
    onChange([...selectedUserIds, userId]);
    setSearchTerm("");
  };

  const handleDeselect = (e: React.MouseEvent, userId: number) => {
    e.stopPropagation(); // Evita que el clic en la 'X' cierre el menú
    onChange(selectedUserIds.filter((id) => id !== userId));
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="flex flex-wrap gap-1 items-center p-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
        {selectedUsers.map((user) => (
          <span
            key={user.id}
            className="flex items-center gap-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full"
          >
            {user.name}
            <button
              onClick={(e) => handleDeselect(e, user.id)}
              className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          autoFocus={autoFocus}
          placeholder="Buscar empleado..."
          className="flex-grow bg-transparent focus:outline-none p-1 text-sm"
        />
        <button onClick={() => setIsOpen(!isOpen)} className="p-1">
          <ChevronDown size={16} />
        </button>
      </div>
      {isOpen && (
        // --- ¡CORRECCIÓN CLAVE! ---
        // Al añadir onMouseDown y llamar a e.preventDefault(), evitamos que el input
        // pierda el foco (blur), lo que permite hacer múltiples clics en la lista.
        <ul
          onMouseDown={(e) => e.preventDefault()}
          className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {availableUsers.length > 0 ? (
            availableUsers.map((user) => (
              <li
                key={user.id}
                onClick={() => handleSelect(user.id)}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
              >
                {user.name}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-gray-500">
              No se encontraron usuarios.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default MultiUserSelect;
