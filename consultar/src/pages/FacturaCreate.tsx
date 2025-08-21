// RUTA: /consultar/src/pages/FacturaCreate.tsx

import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { clientService, Client } from "../services/clientService";
import { otService, WorkOrder } from "../services/otService";
import {
  facturacionService,
  FacturaCreateData,
} from "../services/facturacionService";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";
import { ArrowLeft } from "lucide-react";
import ClienteSelect from "../components/ui/ClienteSelect";

const FacturaCreate: React.FC = () => {
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [calculationType, setCalculationType] = useState<
    "manual" | "activities"
  >("manual");

  const { data: clients } = useSWR<Client[]>(
    "/clients",
    clientService.getAllClients
  );
  const { data: ots } = useSWR<WorkOrder[]>(
    selectedClientId ? `/ot/cliente/${selectedClientId}` : null,
    () => otService.getOTsByClientId(selectedClientId!)
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FacturaCreateData>({
    defaultValues: {
      vencimiento: new Date().toISOString().split("T")[0],
      ot_ids: [],
    },
  });

  const selectedOts = watch("ot_ids", []);

  const onSubmit = async (data: FacturaCreateData) => {
    try {
      const dataToSend = {
        ...data,
        ot_ids: data.ot_ids.length > 0 ? data.ot_ids : undefined,
        calculation_type: calculationType,
        // Si es por actividades, no enviamos el monto manual
        monto: calculationType === "manual" ? data.monto : undefined,
      };

      const result = await facturacionService.createFactura(dataToSend);
      navigate(`/facturacion/${result.id}`);
    } catch (error) {
      console.error("Error al crear la factura", error);
      alert("No se pudo crear la factura.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/facturacion")}
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-3xl font-bold ml-4">Crear Nueva Factura</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller
              name="cliente_id"
              control={control}
              rules={{ required: "Debe seleccionar un cliente" }}
              render={({ field }) => (
                <ClienteSelect
                  clients={clients || []}
                  selectedClientId={field.value}
                  onChange={(value) => {
                    const id = Number(value);
                    field.onChange(id);
                    setSelectedClientId(id);
                    setValue("ot_ids", []); // Limpiar OTs al cambiar de cliente
                  }}
                />
              )}
            />
            <Input
              label="Número de Factura"
              {...register("numero_factura", {
                required: "Este campo es obligatorio",
              })}
              error={errors.numero_factura?.message}
            />
            <Input
              label="Fecha de Vencimiento"
              type="date"
              {...register("vencimiento", {
                required: "La fecha es obligatoria",
              })}
              error={errors.vencimiento?.message}
            />

            {/* --- NUEVO: Selector de Tipo de Cálculo --- */}
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Tipo de Cálculo
              </label>
              <div className="flex items-center gap-4 p-2 border rounded-md">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="manual"
                    checked={calculationType === "manual"}
                    onChange={() => setCalculationType("manual")}
                    className="form-radio"
                  />
                  <span className="ml-2">Monto Manual</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="activities"
                    checked={calculationType === "activities"}
                    onChange={() => setCalculationType("activities")}
                    className="form-radio"
                    disabled={selectedOts.length === 0}
                  />
                  <span className="ml-2">Según Actividades de OTs</span>
                </label>
              </div>
            </div>

            {/* --- MODIFICADO: Campo de Monto Condicional --- */}
            {calculationType === "manual" && (
              <Input
                label="Monto Total (ARS)"
                type="number"
                step="0.01"
                {...register("monto", {
                  required:
                    calculationType === "manual"
                      ? "El monto es obligatorio"
                      : false,
                  valueAsNumber: true,
                })}
                error={errors.monto?.message}
              />
            )}
          </div>

          {selectedClientId && (
            <div>
              <h3 className="text-lg font-semibold border-t pt-6 mt-6">
                Vincular Órdenes de Trabajo
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Seleccione las OTs que desea asociar a esta factura.
              </p>
              <div className="space-y-3 max-h-60 overflow-y-auto p-4 border rounded-md bg-gray-50 dark:bg-gray-700/50">
                {ots && ots.length > 0 ? (
                  ots.map((ot) => (
                    <Controller
                      key={ot.id}
                      name="ot_ids"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center space-x-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600/50">
                          <Checkbox
                            id={`ot-${ot.id}`}
                            checked={field.value.includes(ot.id)}
                            onCheckedChange={(checked) => {
                              const newValue = checked
                                ? [...field.value, ot.id]
                                : field.value.filter((id) => id !== ot.id);
                              field.onChange(newValue);
                            }}
                          />
                          <label
                            htmlFor={`ot-${ot.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {ot.custom_id} -{" "}
                            <span className="text-gray-700 dark:text-gray-300">
                              {ot.product}
                            </span>
                          </label>
                        </div>
                      )}
                    />
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    Este cliente no tiene OTs pendientes de facturación.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear Factura"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default FacturaCreate;
