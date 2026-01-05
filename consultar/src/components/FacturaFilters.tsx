// RUTA: consultar/src/components/FacturaFilters.tsx

import React from "react";
import useSWR from "swr";
import { clientService, Client } from "../services/clientService";
import ClienteSelect from "./ui/ClienteSelect";
import Input from "./ui/Input";
import Button from "./ui/Button";

interface FacturaFiltersProps {
  filters: any;
  onFilterChange: (name: string, value: any) => void;
  onResetFilters: () => void;
}

const FacturaFilters: React.FC<FacturaFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  const { data: clients } = useSWR<Client[]>(
    "/clients",
    clientService.getAllClients
  );

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ClienteSelect
          clients={clients || []}
          selectedClientId={filters.cliente_id}
          onChange={(value) => onFilterChange("cliente_id", value)}
        />
        <Input
          label="Fecha Desde"
          type="date"
          name="fecha_desde"
          value={filters.fecha_desde || ""}
          onChange={(e) => onFilterChange(e.target.name, e.target.value)}
        />
        <Input
          label="Fecha Hasta"
          type="date"
          name="fecha_hasta"
          value={filters.fecha_hasta || ""}
          onChange={(e) => onFilterChange(e.target.name, e.target.value)}
        />
        <div>
          <label className="text-sm font-medium dark:text-gray-300">
            Estado
          </label>
          <select
            name="estado"
            value={filters.estado || ""}
            onChange={(e) => onFilterChange(e.target.name, e.target.value)}
            className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagada">Pagada</option>
            <option value="vencida">Vencida</option>
            <option value="archivada">Archivada</option> {/* Nuevo estado */}
          </select>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onResetFilters}>
          Limpiar Filtros
        </Button>
      </div>
    </div>
  );
};

export default FacturaFilters;
