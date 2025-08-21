// RUTA: consultar/src/components/OTSelect.tsx

import React, { useState, useEffect } from "react";
import { otService, WorkOrder } from "../services/otService";
import useSWR from "swr";

interface OTSelectProps {
  clienteId: number;
  onSelectionChange: (selectedOts: WorkOrder[]) => void;
}

const OTSelect: React.FC<OTSelectProps> = ({
  clienteId,
  onSelectionChange,
}) => {
  // Usamos un SWR para obtener las OTs del cliente, se recargará si el clienteId cambia
  const { data: ots } = useSWR<WorkOrder[]>(
    clienteId ? `/clients/${clienteId}/ots` : null,
    () => otService.getOTsByClientId(clienteId) // Asumimos que esta función existe en otService
  );

  const [selectedOtIds, setSelectedOtIds] = useState<Set<number>>(new Set());

  const handleCheckboxChange = (ot: WorkOrder) => {
    const newSelection = new Set(selectedOtIds);
    if (newSelection.has(ot.id)) {
      newSelection.delete(ot.id);
    } else {
      newSelection.add(ot.id);
    }
    setSelectedOtIds(newSelection);
  };

  useEffect(() => {
    // Cuando la selección cambia, llamamos a la función del padre
    // con los objetos de OT completos
    const selected = (ots || []).filter((ot) => selectedOtIds.has(ot.id));
    onSelectionChange(selected);
  }, [selectedOtIds, ots, onSelectionChange]);

  return (
    <div className="border rounded-md p-3 max-h-60 overflow-y-auto bg-white dark:bg-gray-800">
      {ots && ots.length > 0 ? (
        <ul className="space-y-2">
          {ots.map((ot) => (
            <li key={ot.id} className="flex items-center">
              <input
                type="checkbox"
                id={`ot-${ot.id}`}
                checked={selectedOtIds.has(ot.id)}
                onChange={() => handleCheckboxChange(ot)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor={`ot-${ot.id}`}
                className="ml-3 text-sm text-gray-700 dark:text-gray-300"
              >
                {ot.custom_id || `OT #${ot.id}`} - {ot.product}
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">
          No hay OTs disponibles para este cliente.
        </p>
      )}
    </div>
  );
};

// Necesitamos añadir esta función al otService para que el componente funcione
// Añade esto a tu archivo 'consultar/src/services/otService.ts'
/*
  async getOTsByClientId(clientId: number): Promise<WorkOrder[]> {
    const response = await axiosInstance.get(`/ots/cliente/${clientId}`);
    return response.data;
  }
*/

export default OTSelect;
