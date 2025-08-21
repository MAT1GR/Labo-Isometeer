import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  facturacionService,
  FacturaCreateData,
} from "../../services/facturacionService";
import { clientService, Client } from "../../services/clientService";
import { otService, WorkOrder } from "../../services/otService";
import Input from "./Input";
import Button from "./Button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onFacturaCreated: () => void;
}

const FacturaCreateModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onFacturaCreated,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FacturaCreateData>({
    defaultValues: {
      vencimiento: new Date().toISOString().split("T")[0],
      ot_ids: [],
      calculation_type: "manual",
    },
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [availableOTs, setAvailableOTs] = useState<WorkOrder[]>([]);
  const [selectedOTs, setSelectedOTs] = useState<number[]>([]);
  const [calculationType, setCalculationType] = useState<
    "manual" | "activities"
  >("manual");

  const selectedClientId = watch("cliente_id");

  useEffect(() => {
    const loadClients = async () => {
      try {
        const clientData = await clientService.getAllClients();
        setClients(clientData);
      } catch (error) {
        console.error("Error al cargar clientes", error);
      }
    };
    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  useEffect(() => {
    const loadOTs = async () => {
      if (selectedClientId) {
        try {
          // CORRECCIÓN 1 y 2: Nombre del método corregido y se quita parseInt
          const otData = await otService.getOTsByClientId(selectedClientId);
          // CORRECCIÓN 3: Se añade el tipo explícito a 'ot'
          setAvailableOTs(otData.filter((ot: WorkOrder) => !ot.facturada));
        } catch (error) {
          console.error("Error al cargar OTs", error);
          setAvailableOTs([]);
        }
      } else {
        setAvailableOTs([]);
      }
      setSelectedOTs([]);
    };
    if (isOpen) {
      loadOTs();
    }
  }, [selectedClientId, isOpen]);

  const handleOTToggle = (otId: number) => {
    setSelectedOTs((prev) =>
      prev.includes(otId) ? prev.filter((id) => id !== otId) : [...prev, otId]
    );
  };

  const onSubmit = async (data: FacturaCreateData) => {
    try {
      await facturacionService.createFactura({
        ...data,
        monto: calculationType === "manual" ? Number(data.monto) : undefined,
        cliente_id: Number(data.cliente_id),
        ot_ids: selectedOTs,
        calculation_type: calculationType,
      });
      onFacturaCreated();
      onClose();
      reset();
    } catch (error) {
      console.error("Error al crear la factura", error);
      alert("No se pudo crear la factura.");
    }
  };

  useEffect(() => {
    if (!isOpen) {
      reset();
      setSelectedOTs([]);
      setAvailableOTs([]);
      setCalculationType("manual");
    }
  }, [isOpen, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">Nueva Factura</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* ... resto del formulario ... */}
          <Input
            label="Número de Factura"
            {...register("numero_factura", {
              required: "El número de factura es obligatorio",
            })}
          />
          {/* ... */}
          <div>
            <label>Cliente</label>
            <select
              {...register("cliente_id", {
                required: "Debe seleccionar un cliente",
              })}
              className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md"
            >
              <option value="">Seleccione un cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          {/* ... */}
          <Input
            label="Vencimiento"
            type="date"
            {...register("vencimiento", {
              required: "La fecha de vencimiento es obligatoria",
            })}
          />
          {/* ... */}
          <div className="space-y-2">
            <label>Tipo de Cálculo</label>
            <div className="flex items-center gap-4">
              <label>
                <input
                  type="radio"
                  value="manual"
                  checked={calculationType === "manual"}
                  onChange={() => setCalculationType("manual")}
                />
                Monto Manual
              </label>
              <label>
                <input
                  type="radio"
                  value="activities"
                  checked={calculationType === "activities"}
                  onChange={() => setCalculationType("activities")}
                  disabled={selectedOTs.length === 0}
                />
                Monto por Actividades de OT
              </label>
            </div>
          </div>

          {calculationType === "manual" && (
            <Input
              label="Monto"
              type="number"
              step="0.01"
              {...register("monto", {
                required: calculationType === "manual",
                valueAsNumber: true,
              })}
            />
          )}

          {selectedClientId && (
            <div>
              <label>Órdenes de Trabajo Disponibles</label>
              <div className="mt-2 border rounded-md max-h-40 overflow-y-auto p-2">
                {availableOTs.length > 0 ? (
                  // CORRECCIÓN 3 (de nuevo): Se añade el tipo explícito a 'ot'
                  availableOTs.map((ot: WorkOrder) => (
                    <div key={ot.id} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`ot-${ot.id}`}
                        checked={selectedOTs.includes(ot.id)}
                        onChange={() => handleOTToggle(ot.id)}
                      />
                      <label htmlFor={`ot-${ot.id}`} className="ml-2">
                        {ot.custom_id} - {ot.product}
                      </label>
                    </div>
                  ))
                ) : (
                  <p>No hay OTs pendientes de facturar para este cliente.</p>
                )}
              </div>
            </div>
          )}
          {/* ... */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Crear Factura</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FacturaCreateModal;
