// consultar/src/components/ui/UserAssignmentModal.tsx

import React, { useState, useEffect, useMemo } from "react";
import { User } from "../../services/auth";
import { X } from "lucide-react";
import Button from "./Button";
import Modal from "./Modal"; // Assuming a generic Modal component exists

interface UserAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  initialSelectedUserIds: number[];
  onConfirmAssignment: (selectedIds: number[]) => void;
}

type UserRole = "director" | "empleado" | "administracion" | "administrador";

const UserAssignmentModal: React.FC<UserAssignmentModalProps> = ({
  isOpen,
  onClose,
  allUsers,
  initialSelectedUserIds,
  onConfirmAssignment,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(
    initialSelectedUserIds
  );
  const [filterRole, setFilterRole] = useState<UserRole | "all">("empleado"); // Changed default to "empleado"

  useEffect(() => {
    setSelectedUserIds(initialSelectedUserIds);
  }, [initialSelectedUserIds]);

  const roles: UserRole[] = ["director", "empleado", "administracion"]; // Changed "colaborador" to "empleado"

  const filteredUsers = useMemo(() => {
    if (filterRole === "all") {
      return allUsers;
    }
    return allUsers.filter((user) => user.role === filterRole);
  }, [allUsers, filterRole]);

  const handleUserClick = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleConfirm = () => {
    onConfirmAssignment(selectedUserIds);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Seleccionar Usuarios por Tipo">
      <div className="p-4">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Selecciona los tipos de actividades que se realizarán en esta orden de trabajo.
        </p>

        {/* Role Filter Tabs */}
        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 mb-4">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md capitalize ${
                filterRole === role
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {/* User List */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-2">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => handleUserClick(user.id)}
                className={`p-3 border rounded-lg cursor-pointer transition-all duration-200
                  ${
                    selectedUserIds.includes(user.id)
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500"
                      : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
              >
                <p className="font-semibold dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {user.role}
                </p>
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500 dark:text-gray-400">
              No hay usuarios con este rol.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-between items-center border-t pt-4 border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium dark:text-white">
            {selectedUserIds.length} usuario(s) seleccionado(s)
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={selectedUserIds.length === 0}>
              Confirmar Selección
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default UserAssignmentModal;
