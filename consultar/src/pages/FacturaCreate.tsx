// RUTA: /consultar/src/pages/FacturaCreate.tsx

import React, { useState, useEffect } from "react";
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
import { ArrowLeft, Edit, ListChecks, Check } from "lucide-react";
import ClienteSelect from "../components/ui/ClienteSelect";
import { cn } from "../lib/utils"; // Importamos la utilidad cn

const FacturaCreate: React.FC = () => {
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [calculationType, setCalculationType] = useState<
    "manual" | "activities"
  >("manual");

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
      calculation_type: "manual",
      tipo: "A",
      moneda: "ARS",
    },
  });

  const selectedOts = watch("ot_ids") || [];
  const { data: clients } = useSWR<Client[]>(
    "/clients",
    clientService.getAllClients
  );
  const { data: ots, error: otsError } = useSWR<WorkOrder[]>(
    selectedClientId ? `/ot/cliente/${selectedClientId}` : null,
    () => otService.getOTsByClientId(selectedClientId!)
  );

  useEffect(() => {
    setValue("ot_ids", []);
  }, [selectedClientId, setValue]);

  const onSubmit = async (data: FacturaCreateData) => {
    try {
      const dataToSend: Partial<FacturaCreateData> = {
        ...data,
        calculation_type: calculationType,
        ot_ids: selectedOts.length > 0 ? selectedOts : undefined,
        monto: calculationType === "manual" ? data.monto : undefined,
      };
      const result = await facturacionService.createFactura(dataToSend);
      alert("¡Factura creada con éxito!");
      navigate(`/facturacion/${result.id}`);
    } catch (error) {
      console.error("Error al crear la factura", error);
      alert(
        "No se pudo crear la factura. Revisa la consola para más detalles."
      );
    }
  };

  const availableOts = ots?.filter((ot) => !ot.facturada) || [];
  const isMontoDisabled = calculationType === "activities";
  const moneda = watch("moneda");

  return (
    <div className="max-w-4xl mx-auto p-4">
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4">
          {/* SECCIÓN 1: DATOS BÁSICOS (MONTO INCLUIDO) */}
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
                    const id = value ? Number(value) : null;
                    field.onChange(id);
                    setSelectedClientId(id);
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
            <div>
              <label
                htmlFor="tipo"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Tipo de Factura
              </label>
              <select
                id="tipo"
                {...register("tipo", { required: "Este campo es obligatorio" })}
                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="E">E</option>
                <option value="ND">ND</option>
                <option value="NC">NC</option>
              </select>
              {errors.tipo && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.tipo.message}
                </p>
              )}
            </div>
            <Input
              label="Fecha de Vencimiento"
              type="date"
              {...register("vencimiento", {
                required: "La fecha es obligatoria",
              })}
              error={errors.vencimiento?.message}
            />
            <div>
              <label
                htmlFor="moneda"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Moneda
              </label>
              <select
                id="moneda"
                {...register("moneda")}
                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Input
                label={`Monto Total (${moneda})`}
                type="number"
                step="0.01"
                {...register("monto", {
                  required: !isMontoDisabled && "El monto es obligatorio",
                  valueAsNumber: true,
                  min: { value: 0.01, message: "El monto debe ser positivo." },
                })}
                error={errors.monto?.message}
                disabled={isMontoDisabled}
                className={cn(
                  "transition-all duration-300",
                  isMontoDisabled &&
                    "bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-70"
                )}
              />
            </div>
            <div className="md:col-span-2">
              <label
                htmlFor="observaciones"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Observaciones
              </label>
              <textarea
                id="observaciones"
                {...register("observaciones")}
                rows={3}
                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* SECCIÓN 2: TIPO DE CÁLCULO */}
          <div className="space-y-2 pt-4">
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-300">
              Tipo de Cálculo del Monto
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant={!isMontoDisabled ? "default" : "outline"}
                onClick={() => setCalculationType("manual")}
                className="w-full justify-start text-left py-3"
              >
                <Edit className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="flex-grow">Monto Manual</span>
                {!isMontoDisabled && <Check className="ml-3 h-5 w-5" />}
              </Button>
              <Button
                type="button"
                variant={isMontoDisabled ? "default" : "outline"}
                onClick={() => setCalculationType("activities")}
                disabled={selectedOts.length === 0}
                className="w-full justify-start text-left py-3"
              >
                <ListChecks className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="flex-grow">Según Actividades</span>
                {isMontoDisabled && <Check className="ml-3 h-5 w-5" />}
              </Button>
            </div>
            {selectedOts.length === 0 && (
              <p className="!mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                Seleccione al menos una OT para habilitar el cálculo por
                actividades.
              </p>
            )}
          </div>

          {/* SECCIÓN 3: VINCULACIÓN DE OTS CON TRANSICIÓN */}
          <div
            className={cn(
              "transition-all duration-500 ease-in-out overflow-hidden",
              selectedClientId
                ? "max-h-[500px] opacity-100"
                : "max-h-0 opacity-0"
            )}
          >
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold">
                Vincular Órdenes de Trabajo
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Seleccione las OTs a facturar.
              </p>
              <div className="space-y-3 max-h-60 overflow-y-auto p-4 border rounded-md bg-gray-50 dark:bg-gray-700/50">
                {otsError && (
                  <p className="text-center text-red-500">
                    Error al cargar las OTs.
                  </p>
                )}
                {!ots && !otsError && (
                  <p className="text-center text-gray-500">Cargando OTs...</p>
                )}
                {availableOts.length > 0
                  ? availableOts.map((ot) => (
                      <Controller
                        key={ot.id}
                        name="ot_ids"
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-3 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600/50">
                            <Checkbox
                              id={`ot-${ot.id}`}
                              checked={field.value?.includes(ot.id)}
                              onCheckedChange={(checked) => {
                                const currentIds = field.value || [];
                                const newIds = checked
                                  ? [...currentIds, ot.id]
                                  : currentIds.filter((id) => id !== ot.id);
                                field.onChange(newIds);
                              }}
                            />
                            <label
                              htmlFor={`ot-${ot.id}`}
                              className="font-medium cursor-pointer w-full"
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
                  : !otsError && (
                      <p className="text-center text-gray-500 py-4">
                        No hay OTs pendientes de facturación.
                      </p>
                    )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: BOTÓN DE ENVÍO */}
          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={isSubmitting} size="lg">
              {isSubmitting ? "Creando..." : "Crear Factura"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default FacturaCreate;
