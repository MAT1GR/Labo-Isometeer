// RUTA: /consultar/src/components/OTCreateForm.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Controller } from "react-hook-form";
import Select from "react-select";
import Input from "./ui/Input";
import Button from "./ui/Button";
import Card from "./ui/Card";
import ClienteSelect from "./ui/ClienteSelect";
import MultiUserSelect from "./ui/MultiUserSelect";
import NormaFields from "./NormaFields";
import {
  Save,
  PlusCircle,
  Trash2,
  Loader,
  UserSquare,
  Package,
  ClipboardList,
  BookText,
  FileText,
  Plus,
} from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { useOTCreateForm } from "../hooks/useOTCreateForm";
import NavigationPrompt from "./ui/NavigationPrompt";
import CreateFacturaModal from "./CreateFacturaModal";

const OTCreateForm: React.FC = () => {
  const navigate = useNavigate();
  const {
    formMethods,
    isSaving,
    clients,
    contacts,
    users,
    contracts,
    facturasCliente,
    idPreview,
    isIdLoading,
    isCreateFacturaModalOpen,
    setCreateFacturaModalOpen,
    watchedActivities,
    selectedClientId,
    isLacreEnabled,
    fields,
    append,
    remove,
    onSubmit, // <-- Esta es la función ya procesada por handleSubmit
    handleFacturaCreated,
    getAvailableActivities,
  } = useOTCreateForm();

  const {
    register,
    control,
    formState: { isSubmitting, isDirty },
  } = formMethods;

  const otTypes = [
    { value: "Produccion", label: "Producción" },
    { value: "Calibracion", label: "Calibración" },
    { value: "Ensayo SE", label: "Ensayo SE" },
    { value: "Ensayo EE", label: "Ensayo EE" },
    { value: "Otros Servicios", label: "Otros Servicios" },
  ];

  const facturaOptions = facturasCliente.map((f) => ({
    value: f.id,
    label: `${f.numero_factura} - ${formatCurrency(f.monto)}`,
  }));

  const suggestedAmountForFactura =
    watchedActivities?.reduce(
      (sum, act) => sum + (Number(act.precio_sin_iva) || 0),
      0
    ) || 0;

  const sealEntities = [
    "IRAM",
    "UL",
    "IQC",
    "Intertek",
    "Qetkra",
    "BVA",
    "TÜV",
  ];

  return (
    <>
      <NavigationPrompt
        when={isDirty && !isSaving}
        onSave={onSubmit} // <-- CORREGIDO: Usar directamente
      />
      <CreateFacturaModal
        isOpen={isCreateFacturaModalOpen}
        onClose={() => setCreateFacturaModalOpen(false)}
        clienteId={Number(selectedClientId)}
        clienteName={
          clients.find((c) => c.id === Number(selectedClientId))?.name || ""
        }
        suggestedAmount={suggestedAmountForFactura}
        onFacturaCreated={handleFacturaCreated}
      />

      <form onSubmit={onSubmit} className="space-y-6">
        {" "}
        {/* <-- CORREGIDO: Usar directamente */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Crear Nueva Orden de Trabajo</h1>
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/ot")}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <Save className="h-5 w-5" />
              {isSubmitting ? "Creando..." : "Crear y Continuar"}
            </Button>
          </div>
        </div>
        <div className="space-y-6">
          <Card>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Input
                label="Fecha *"
                type="date"
                {...register("date", { required: true })}
              />
              <div>
                <label className="text-sm font-medium dark:text-gray-300">
                  Tipo de OT *
                </label>
                <select
                  {...register("type", { required: true })}
                  className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Seleccionar tipo...</option>
                  {otTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium dark:text-gray-300">
                  Contrato
                </label>
                <select
                  {...register("contract_type")}
                  className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Sin contrato</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.name}>
                      {contract.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Input label="ID de OT" value={idPreview} disabled readOnly />
                {isIdLoading && (
                  <Loader className="absolute right-3 top-9 h-5 w-5 animate-spin text-gray-400" />
                )}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full mb-4 flex items-center gap-2">
              <UserSquare size={20} /> Información del Cliente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Controller
                control={control}
                name="client_id"
                rules={{ required: true }}
                render={({ field }) => (
                  <ClienteSelect
                    clients={clients}
                    selectedClientId={field.value as number | undefined}
                    onChange={(value) => field.onChange(value)}
                  />
                )}
              />
              <div>
                <label className="text-sm font-medium dark:text-gray-300">
                  Referente
                </label>
                <select
                  {...register("contact_id")}
                  className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  disabled={!selectedClientId || contacts.length === 0}
                >
                  <option value="">
                    {contacts.length > 0
                      ? "Seleccionar referente..."
                      : "Sin referentes"}
                  </option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full mb-4 flex items-center gap-2">
              <Package size={20} /> Producto
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nombre *"
                {...register("product", { required: true })}
              />
              <Input label="Marca" {...register("brand")} />
              <Input label="Modelo" {...register("model")} />

              <div>
                <label className="text-sm font-medium dark:text-gray-300">
                  Nº de Lacre
                </label>
                <div className="flex w-full items-center mt-1">
                  <select
                    {...register("seal_entity")}
                    className="flex-shrink-0 w-[30%] p-2 border-r-0 rounded-l-md dark:bg-gray-700 dark:border-gray-600"
                    disabled={!isLacreEnabled}
                  >
                    <option value="">Entidad...</option>
                    {sealEntities.map((entity) => (
                      <option key={entity} value={entity}>
                        {entity}
                      </option>
                    ))}
                  </select>
                  <Input
                    {...register("seal_number")}
                    className="flex-grow rounded-l-none"
                    disabled={!isLacreEnabled}
                  />
                </div>
              </div>

              <Input
                label="Vto. del Certificado"
                type="date"
                {...register("certificate_expiry")}
                disabled={!isLacreEnabled}
              />
              <Input
                label="Fecha de Entrega Estimada"
                type="date"
                {...register("estimated_delivery_date")}
              />
            </div>
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <ClipboardList size={20} /> Actividades y Asignaciones
              </h2>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  append({
                    activity: "",
                    assigned_users: [],
                    normas: [{ value: "" }],
                    precio_sin_iva: "" as any,
                    currency: "ARS",
                  })
                }
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Agregar Actividad
              </Button>
            </div>
            <div className="space-y-6">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border dark:border-gray-600"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-md text-gray-700 dark:text-gray-200">
                      Actividad #{index + 1}
                    </h3>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-1 dark:text-gray-300">
                          Actividad
                        </label>
                        <select
                          {...register(`activities.${index}.activity`)}
                          className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                        >
                          <option value="">Seleccionar...</option>
                          {getAvailableActivities(index).map((opt) => (
                            <option key={opt.id} value={opt.activity}>
                              {opt.activity}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-1 dark:text-gray-300">
                          Asignar a
                        </label>
                        <Controller
                          control={control}
                          name={`activities.${index}.assigned_users` as any}
                          render={({ field }) => (
                            <MultiUserSelect
                              users={users}
                              selectedUserIds={(field.value || []).map(
                                (u: any) => u.id
                              )}
                              onChange={(userIds: number[]) => {
                                const selectedUsers = userIds
                                  .map((id) => users.find((u) => u.id === id))
                                  .filter(Boolean);
                                field.onChange(selectedUsers);
                              }}
                            />
                          )}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <NormaFields
                        activityIndex={index}
                        control={control}
                        register={register}
                      />
                      <div>
                        <label className="text-sm font-medium mb-1 dark:text-gray-300">
                          Precio (Sin IVA)
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`activities.${index}.precio_sin_iva`, {
                              valueAsNumber: true,
                            })}
                            placeholder="Ej: 15000"
                            className="w-full"
                          />
                          <select
                            {...register(`activities.${index}.currency`)}
                            className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 h-[42px]"
                          >
                            <option value="ARS">ARS</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                <FileText size={20} /> Facturas Vinculadas
              </h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setCreateFacturaModalOpen(true)}
                disabled={!selectedClientId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Factura
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium dark:text-gray-300">
                Vincular facturas existentes
              </label>
              <Controller
                name="factura_ids"
                control={control}
                render={({ field }) => (
                  <Select
                    isMulti
                    options={facturaOptions}
                    value={facturaOptions.filter(
                      (option) =>
                        Array.isArray(field.value) &&
                        field.value.includes(option.value)
                    )}
                    isDisabled={!selectedClientId}
                    placeholder={
                      !selectedClientId
                        ? "Seleccione un cliente primero"
                        : "Buscar y seleccionar facturas..."
                    }
                    onChange={(selectedOptions) =>
                      field.onChange(
                        selectedOptions.map((option) => option.value)
                      )
                    }
                    className="react-select-container mt-1"
                    classNamePrefix="react-select"
                  />
                )}
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full mb-4 flex items-center gap-2">
              <BookText size={20} /> Observaciones
            </h2>
            <label className="text-sm font-medium dark:text-gray-300">
              Observaciones Generales (visibles para el cliente)
            </label>
            <textarea
              {...register("observations")}
              className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              rows={3}
            ></textarea>
          </Card>
        </div>
      </form>
    </>
  );
};

export default OTCreateForm;
