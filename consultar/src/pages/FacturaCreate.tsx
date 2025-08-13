// RUTA: /consultar/src/pages-nuevas/FacturaCreate.tsx

import React, { useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import useSWR, { mutate } from "swr";
import { facturacionService } from "../services/facturacionService";
import { workOrderService, WorkOrder } from "../services/workOrderService";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Checkbox } from "../components/ui/Checkbox";
import { ArrowLeft, AlertTriangle } from "lucide-react";

type FacturaFormData = {
  monto: number;
  vencimiento: string;
  ot_ids: number[];
};

const FacturaCreate: React.FC = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FacturaFormData>({
    defaultValues: {
      vencimiento: new Date().toISOString().split("T")[0],
      ot_ids: [],
    },
  });

  const { data: workOrders = [], error: workOrdersError } = useSWR<WorkOrder[]>(
    "/work-orders",
    () => workOrderService.getWorkOrders({})
  );
  const selectedOtIds = watch("ot_ids");

  // --- DIAGNÓSTICO ---
  useEffect(() => {
    console.log("Órdenes de trabajo cargadas:", workOrders);
    if (workOrdersError) console.error("Error cargando OTs:", workOrdersError);
  }, [workOrders, workOrdersError]);

  const selectedClientInfo = useMemo(() => {
    if (selectedOtIds.length === 0) {
      return { clientId: null, clientName: null, isValid: true };
    }
    const firstOt = workOrders.find((ot) => ot.id === selectedOtIds[0]);
    if (!firstOt) return { clientId: null, clientName: null, isValid: false };

    const clientId = firstOt.client_id;
    const clientName = firstOt.client_name;

    const allSameClient = selectedOtIds.every((id) => {
      const ot = workOrders.find((ot) => ot.id === id);
      return ot && ot.client_id === clientId;
    });

    return { clientId, clientName, isValid: allSameClient };
  }, [selectedOtIds, workOrders]);

  const handleOtSelect = (otId: number) => {
    console.log(`Click en Checkbox para OT ID: ${otId}`); // --- DIAGNÓSTICO ---
    const currentIds = watch("ot_ids");
    const newIds = currentIds.includes(otId)
      ? currentIds.filter((id) => id !== otId)
      : [...currentIds, otId];
    setValue("ot_ids", newIds, { shouldValidate: true });
    console.log("Nuevo estado de ot_ids:", newIds); // --- DIAGNÓSTICO ---
  };

  const onSubmit = async (data: FacturaFormData) => {
    if (!selectedClientInfo.isValid) {
      alert(
        "Error: Todas las órdenes de trabajo deben pertenecer al mismo cliente."
      );
      return;
    }
    if (data.ot_ids.length === 0) {
      alert("Debes seleccionar al menos una orden de trabajo.");
      return;
    }
    try {
      const newFactura = await facturacionService.createFactura(data);
      mutate("/facturacion");
      navigate(`/facturacion/${newFactura.id}`);
    } catch (error) {
      console.error("Error al crear la factura:", error);
      alert("No se pudo crear la factura.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate("/facturacion")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">Crear Nueva Factura</h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-xl font-semibold mb-4">
              Seleccionar Órdenes de Trabajo
            </h2>
            {workOrders.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                {workOrdersError
                  ? "Error al cargar las OTs."
                  : "No hay órdenes de trabajo disponibles para facturar."}
              </p>
            )}
            <div className="max-h-[500px] overflow-y-auto">
              <table className="min-w-full">
                <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="p-2 w-10"></th>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Título</th>
                    <th className="p-2 text-left">Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((ot) => (
                    <tr key={ot.id} className="border-t">
                      <td className="p-2 text-center">
                        <Checkbox
                          id={`ot-${ot.id}`}
                          checked={selectedOtIds.includes(ot.id)}
                          onCheckedChange={() => handleOtSelect(ot.id)}
                        />
                      </td>
                      <td className="p-2 font-mono">{ot.custom_id}</td>
                      <td className="p-2">{ot.title}</td>
                      <td className="p-2">{ot.client_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4">
              Detalles de la Factura
            </h2>
            <div className="space-y-4">
              <Input
                label="Monto Total"
                type="number"
                step="0.01"
                {...register("monto", {
                  required: "El monto es requerido",
                  valueAsNumber: true,
                })}
                error={errors.monto?.message}
              />
              <Input
                label="Fecha de Vencimiento"
                type="date"
                {...register("vencimiento", {
                  required: "La fecha es requerida",
                })}
                error={errors.vencimiento?.message}
              />
              <div>
                <p className="text-sm font-medium">Cliente</p>
                <p className="mt-1 text-lg font-semibold h-7">
                  {selectedClientInfo.clientName || "Selecciona OTs..."}
                </p>
              </div>
              {!selectedClientInfo.isValid && (
                <div className="text-red-600 flex items-center gap-2 p-2 bg-red-50 rounded-md">
                  <AlertTriangle size={18} />
                  <span className="text-sm">
                    Selecciona OTs del mismo cliente.
                  </span>
                </div>
              )}
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  !selectedClientInfo.isValid ||
                  selectedOtIds.length === 0
                }
                className="w-full"
              >
                {isSubmitting ? "Creando..." : "Crear Factura"}
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default FacturaCreate;
