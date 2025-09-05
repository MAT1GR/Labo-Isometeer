// RUTA: /cliente/src/components/OTFilters.tsx

import React from "react";
import { Client } from "../services/clientService";
import { User } from "../services/auth";
import Input from "./ui/Input";
import Button from "./ui/Button";
import { X } from "lucide-react";

interface OTFiltersProps {
  filters: any;
  setFilters: (filters: any) => void;
  clients: Client[];
  users: User[];
  onClose: () => void;
}

const OTFilters: React.FC<OTFiltersProps> = ({
  filters,
  setFilters,
  clients,
  users,
  onClose,
}) => {
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700 mb-6 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Filtrar Órdenes de Trabajo</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Input
          label="ID de OT o Producto"
          name="searchTerm"
          value={filters.searchTerm || ""}
          onChange={handleInputChange}
          placeholder="Buscar por ID o producto..."
        />
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Cliente
          </label>
          <select
            name="clientId"
            value={filters.clientId || ""}
            onChange={handleInputChange}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">Todos</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Asignado a
          </label>
          <select
            name="assignedToId"
            value={filters.assignedToId || ""}
            onChange={handleInputChange}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">Cualquiera</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Estado
          </label>
          <select
            name="status"
            value={filters.status || ""}
            onChange={handleInputChange}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_progreso">En Progreso</option>
            <option value="finalizada">Finalizada</option>
            <option value="facturada">Facturada</option>
            <option value="cerrada">Cerrada</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Autorización
          </label>
          <select
            name="authorized"
            value={filters.authorized || ""}
            onChange={handleInputChange}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">Ambos</option>
            <option value="true">Autorizadas</option>
            <option value="false">No Autorizadas</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="w-full"
          >
            Limpiar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OTFilters;
