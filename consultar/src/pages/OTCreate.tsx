// RUTA: consultar/src/pages/OTCreate.tsx (Corregido)

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { clientService, Client } from "../services/clientService";
import { otService, WorkOrderCreateData } from "../services/otService";
import { contractService, Contract } from "../services/contractService";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";
import ClienteSelect from "../components/ui/ClienteSelect";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { calculateEstimatedDeliveryDate } from "../lib/utils";
import NavigationPrompt from "../components/ui/NavigationPrompt";

const OTCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(
    null
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<WorkOrderCreateData>({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      activities: [],
      authorized: false,
      contract_type: "Contrato de Producción",
      moneda: "ARS",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities",
  });

  const { data: clients } = useSWR<Client[]>(
    "/clients",
    clientService.getAllClients
  );
  const { data: contracts } = useSWR<Contract[]>(
    "/contracts",
    contractService.getAllContracts
  );

  const watchClientId = watch("client_id");
  const activities = watch("activities");
  const moneda = watch("moneda");

  const isMonedaLocked = activities.some(
    (act) => act.precio_sin_iva && Number(act.precio_sin_iva) > 0
  );

  useEffect(() => {
    if (watchClientId && clients) {
      const client = clients.find((c) => c.id === watchClientId);
      setSelectedClient(client || null);
      // Reset contact when client changes
      setSelectedContactId(null);
      setValue("contact_id", undefined);
    } else {
      setSelectedClient(null);
    }
  }, [watchClientId, clients, setValue]);

  const onSubmit = async (data: WorkOrderCreateData) => {
    if (!user) {
      alert("Debes estar logueado para crear una OT.");
      return;
    }
    try {
      const dataToSend = {
        ...data,
        client_id: selectedClientId!,
        contact_id: selectedContactId ?? undefined,
        created_by: user.id,
      };
      const result = await otService.createOT(dataToSend);
      alert(`¡OT ${result.custom_id} creada con éxito!`);
      navigate(`/ots/${result.id}`);
    } catch (error) {
      console.error("Error al crear la OT:", error);
      alert("No se pudo crear la OT. Revisa la consola para más detalles.");
    }
  };

  const handleAddActivity = () => {
    append({ activity: "", norma: "", precio_sin_iva: 0 });
  };

  const handleDeliveryDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = parseInt(e.target.value, 10);
    if (!isNaN(days) && days >= 0) {
      setValue("estimated_delivery_date", calculateEstimatedDeliveryDate(days));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <NavigationPrompt when={isDirty} />
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/ots")}
          aria-label="Volver a Órdenes de Trabajo"
        >
          <ArrowLeft />
        </Button>
        <h1 className="text-3xl font-bold ml-4">
          Crear Nueva Orden de Trabajo
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Sección de Cliente y Contacto */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">1. Datos del Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Controller
                name="client_id"
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
                    error={errors.client_id?.message}
                  />
                )}
              />
              <div>
                <label
                  htmlFor="contact_id"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Contacto (Opcional)
                </label>
                <select
                  id="contact_id"
                  {...register("contact_id", {
                    setValueAs: (v) => (v ? Number(v) : undefined),
                  })}
                  value={selectedContactId ?? ""}
                  onChange={(e) =>
                    setSelectedContactId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  disabled={!selectedClient || !selectedClient.contacts?.length}
                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-200"
                >
                  <option value="">
                    {selectedClient
                      ? "Seleccione un contacto"
                      : "Seleccione un cliente primero"}
                  </option>
                  {selectedClient?.contacts?.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} ({contact.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Sección de Equipo y OT */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">2. Datos del Equipo</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Producto / Equipo"
                {...register("product", {
                  required: "El producto es obligatorio",
                })}
                error={errors.product?.message}
              />
              <Input label="Marca" {...register("brand")} />
              <Input label="Modelo" {...register("model")} />
              <Input
                label="Número de Serie / Sello"
                {...register("seal_number")}
              />
              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Tipo de Servicio
                </label>
                <select
                  id="type"
                  {...register("type", {
                    required: "El tipo de servicio es obligatorio",
                  })}
                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="Produccion">Producción</option>
                  <option value="Calibracion">Calibración</option>
                  <option value="Ensayo">Ensayo</option>
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.type.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="contract_type"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Tipo de Contrato
                </label>
                <select
                  id="contract_type"
                  {...register("contract_type", {
                    required: "El contrato es obligatorio",
                  })}
                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {contracts?.map((contract) => (
                    <option key={contract.id} value={contract.name}>
                      {contract.name}
                    </option>
                  ))}
                </select>
                {errors.contract_type && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.contract_type.message}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6">
              <label
                htmlFor="observations"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Observaciones del Cliente
              </label>
              <textarea
                id="observations"
                {...register("observations")}
                rows={3}
                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
          </div>
        </Card>

        {/* Sección de Actividades y Fechas */}
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Actividades</h3>
              {/* Selector de Moneda */}
              <div>
                <label
                  htmlFor="moneda"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Moneda de Actividades
                </label>
                <select
                  id="moneda"
                  {...register("moneda")}
                  disabled={isMonedaLocked}
                  className="w-full md:w-auto p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mb-4 p-3 border rounded-md"
              >
                <div className="md:col-span-4">
                  <Input
                    label="Descripción de la Actividad"
                    {...register(`activities.${index}.activity`, {
                      required: "La descripción es obligatoria",
                    })}
                    error={errors.activities?.[index]?.activity?.message}
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    label="Norma Aplicada"
                    {...register(`activities.${index}.norma`)}
                  />
                </div>
                <div className="md:col-span-3">
                  <Input
                    label={`Precio sin IVA (${moneda})`}
                    type="number"
                    step="0.01"
                    {...register(`activities.${index}.precio_sin_iva`, {
                      valueAsNumber: true,
                      min: {
                        value: 0,
                        message: "El precio no puede ser negativo",
                      },
                    })}
                    error={errors.activities?.[index]?.precio_sin_iva?.message}
                  />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => remove(index)}
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddActivity}>
              <Plus className="mr-2 h-4 w-4" />
              Añadir Actividad
            </Button>
            {/* Sección de Fechas */}
            <div className="border-t pt-6 mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Fecha de Ingreso"
                type="date"
                {...register("date", {
                  required: "La fecha de ingreso es obligatoria",
                })}
                error={errors.date?.message}
              />
              <Input
                label="Vencimiento Certificado"
                type="date"
                {...register("certificate_expiry")}
              />
              <Input
                label="Fecha Entrega Estimada"
                type="date"
                {...register("estimated_delivery_date")}
              />
              <div>
                <label
                  htmlFor="delivery_days"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Calcular Entrega (días)
                </label>
                <Input
                  id="delivery_days"
                  type="number"
                  placeholder="Ej: 15"
                  onChange={handleDeliveryDaysChange}
                />
              </div>
            </div>

            {/* Disposition y Autorización */}
            <div className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">
                3. Disposición y Autorización
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="disposition"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Disposición Final del Equipo
                  </label>
                  <select
                    id="disposition"
                    {...register("disposition")}
                    className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="Se entrega calibrado">
                      Se entrega calibrado
                    </option>
                    <option value="Se entrega sin calibrar">
                      Se entrega sin calibrar
                    </option>
                    <option value="Queda en el laboratorio">
                      Queda en el laboratorio
                    </option>
                  </select>
                </div>
                {user?.role !== "empleado" && (
                  <div className="flex items-center pt-6">
                    <Controller
                      name="authorized"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="authorized"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mr-3"
                        />
                      )}
                    />
                    <label
                      htmlFor="authorized"
                      className="text-sm font-medium text-gray-800 dark:text-gray-200"
                    >
                      Autorizar OT (requiere rol de Director o Administrador)
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Botones de Acción */}
        <div className="flex justify-end gap-4 mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/ots")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando OT..." : "Crear Orden de Trabajo"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OTCreate;
