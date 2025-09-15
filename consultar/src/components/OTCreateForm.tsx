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
  ActivitySquare,
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
    onSubmit,
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
      <NavigationPrompt when={isDirty && !isSaving} onSave={onSubmit} />
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
                <div className="flex mt-1">
                  <select
                    {...register("seal_entity")}
                    className="flex-shrink-1 w-20% p-2 border-r-0 rounded-l-md dark:bg-gray-700 dark:border-gray-600"
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
                    className="flex w-full rounded-l-none"
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

          {/* SECCIÓN DE ACTIVIDADES RE-DISEÑADA */}
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
                  className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700/80"
                >
                  <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                      <ActivitySquare size={20} className="text-blue-500" />
                      Actividad #{index + 1}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 px-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {/* --- Columna Izquierda --- */}
                    <div className="flex flex-col gap-4">
                      {/* Actividad */}
                      <div>
                        <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                          Actividad
                        </label>
                        <select
                          {...register(`activities.${index}.activity`)}
                          className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Seleccionar...</option>
                          {getAvailableActivities(index).map((opt) => (
                            <option key={opt.id} value={opt.activity}>
                              {opt.activity}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Normas */}
                      <div className="flex-grow">
                        <NormaFields
                          activityIndex={index}
                          control={control}
                          register={register}
                        />
                      </div>
                    </div>

                    {/* --- Columna Derecha --- */}
                    <div className="flex flex-col gap-4">
                      {/* Asignar a */}
                      <div>
                        <label className="text-sm font-medium mb-1 block dark:text-gray-300">
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

                      {/* Precio */}
                      <div>
                        <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                          Precio (Sin IVA)
                        </label>
                        <div className="flex items-center">
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`activities.${index}.precio_sin_iva`, {
                              valueAsNumber: true,
                            })}
                            placeholder="Ej: 15000"
                            className="w-full rounded-r-none"
                          />
                          <select
                            {...register(`activities.${index}.currency`)}
                            className="p-2 border border-l-0 rounded-md rounded-l-none dark:bg-gray-700 dark:border-gray-600 h-[42px] focus:ring-blue-500 focus:border-blue-500"
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
              {fields.length === 0 && (
                <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400">
                    No hay actividades agregadas.
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Haga clic en "Agregar Actividad" para comenzar.
                  </p>
                </div>
              )}
            </div>
          </Card>
          {/* FIN DE LA SECCIÓN */}

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
