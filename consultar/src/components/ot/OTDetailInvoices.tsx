// RUTA: /consultar/src/components/ot/OTDetailInvoices.tsx

import React from "react";
import { Link } from "react-router-dom";
import { Control, Controller } from "react-hook-form";
import Select from "react-select";
import { WorkOrder } from "../../services/otService";
import { Factura } from "../../services/facturacionService";
import { formatCurrency } from "../../lib/utils";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { FileText, Plus } from "lucide-react";

interface OTDetailInvoicesProps {
  control: Control<WorkOrder>;
  isFormEditable: boolean;
  facturas: Factura[];
  facturasCliente: Factura[];
  onOpenCreateModal: () => void;
}

const OTDetailInvoices: React.FC<OTDetailInvoicesProps> = ({
  control,
  isFormEditable,
  facturas,
  facturasCliente,
  onOpenCreateModal,
}) => {
  const facturaOptions = facturasCliente.map((f) => ({
    value: f.id,
    label: `${f.numero_factura} - ${formatCurrency(f.monto, f.moneda)}`,
  }));

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <FileText size={20} /> Facturas Vinculadas
          </h2>
          {isFormEditable && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenCreateModal}
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Factura
            </Button>
          )}
        </div>
        {isFormEditable ? (
          <div>
            <label className="text-sm font-medium dark:text-gray-300">
              Modificar facturas vinculadas
            </label>
            <Controller
              // --- CORRECCIÓN AQUÍ ---
              // Usamos una aserción de tipo para evitar el error de TypeScript,
              // ya que "factura_ids" es el campo correcto que espera el backend.
              name={"factura_ids" as any}
              control={control}
              render={({ field }) => (
                <Select
                  isMulti
                  options={facturaOptions}
                  value={facturaOptions.filter(
                    (option) =>
                      // Añadimos una comprobación para asegurar que field.value es un array
                      Array.isArray(field.value) &&
                      field.value.includes(option.value)
                  )}
                  onChange={(selectedOptions) =>
                    field.onChange(
                      selectedOptions.map((option) => option.value)
                    )
                  }
                  className="react-select-container mt-1"
                  classNamePrefix="react-select"
                  placeholder="Buscar y seleccionar facturas..."
                />
              )}
            />
          </div>
        ) : (
          <div>
            {facturas && facturas.length > 0 ? (
              <ul className="space-y-2 list-disc list-inside">
                {facturas.map((factura) => (
                  <li key={factura.id}>
                    <Link
                      to={`/facturacion/${factura.id}`}
                      className="text-blue-600 hover:underline hover:text-blue-800 dark:hover:text-blue-400 transition-colors"
                    >
                      {factura.numero_factura} - (
                      {formatCurrency(factura.monto, factura.moneda)})
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">
                No hay facturas vinculadas a esta Orden de Trabajo.
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default OTDetailInvoices;
