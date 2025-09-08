// RUTA: /consultar/src/pages/OTCreate.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useForm,
  useWatch,
  useFieldArray,
  Controller,
  useForm as useModalForm,
} from "react-hook-form";
import { otService, WorkOrder, Activity } from "../services/otService";
import { clientService, Client, Contact } from "../services/clientService";
import { authService, User } from "../services/auth";
import { contractService, Contract } from "../services/contractService";
import { adminService, ActivityPoint } from "../services/adminService";
import { facturacionService, Factura } from "../services/facturacionService";
import { useAuth } from "../contexts/AuthContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
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
  X,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import MultiUserSelect from "../components/ui/MultiUserSelect";
import { calculateEstimatedDeliveryDate, formatCurrency } from "../lib/utils";
import ClienteSelect from "../components/ui/ClienteSelect";
import Card from "../components/ui/Card";
import NavigationPrompt from "../components/ui/NavigationPrompt";
import Select from "react-select";

// --- Interfaces de Tipos para los Formularios ---
interface FacturaFormData {
  numero_factura: string;
  monto: number;
  vencimiento: string;
}

interface CreateFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: number;
  clienteName: string;
  suggestedAmount: number;
  onFacturaCreated: (newFactura: { id: number }) => void;
}

// --- Componente para el Modal de Creación de Factura ---
const CreateFacturaModal: React.FC<CreateFacturaModalProps> = ({
  isOpen,
  onClose,
  clienteId,
  clienteName,
  suggestedAmount,
  onFacturaCreated,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useModalForm<FacturaFormData>();

  useEffect(() => {
    if (isOpen) {
      setValue("monto", suggestedAmount >= 0 ? suggestedAmount : 0);
      setValue("vencimiento", new Date().toISOString().split("T")[0]);
    }
  }, [isOpen, suggestedAmount, setValue]);

  const onSubmit = async (data: FacturaFormData) => {
    if (!clienteId) {
      alert("Error: No se ha seleccionado un cliente.");
      return;
    }
    try {
      const newFactura = await facturacionService.createFactura({
        ...data,
        monto: Number(data.monto),
        cliente_id: clienteId,
      });
      onFacturaCreated(newFactura);
    } catch (error) {
      console.error("Error al crear la factura", error);
      alert("No se pudo crear la factura.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Crear Nueva Factura
        </h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
          Cliente: <span className="font-semibold">{clienteName}</span>
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Número de Factura"
            {...register("numero_factura", { required: true })}
            autoFocus
          />
          <Input
            label="Monto (sugerido por actividades)"
            type="number"
            step="0.01"
            {...register("monto", { required: true, valueAsNumber: true })}
          />
          <Input
            label="Fecha de Vencimiento"
            type="date"
            {...register("vencimiento", { required: true })}
          />
          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear Factura"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

type Norma = {
  value: string;
};

type ActivityFormData = Omit<
  Activity,
  "id" | "work_order_id" | "status" | "norma"
> & {
  normas: Norma[];
  currency: "ARS" | "USD";
};

type OTCreateFormData = Omit<
  WorkOrder,
  | "id"
  | "created_at"
  | "updated_at"
  | "client_name"
  | "creator_name"
  | "contact_name"
  | "activities"
  | "moneda"
> & {
  activities: Partial<ActivityFormData>[];
  factura_ids?: number[];
};

const NormaFields: React.FC<{
  activityIndex: number;
  control: any;
  register: any;
}> = ({ activityIndex, control, register }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `activities.${activityIndex}.normas`,
  });

  return (
    <div>
      <label className="text-sm font-medium mb-1 dark:text-gray-300">
        Normas
      </label>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input
              {...register(`activities.${activityIndex}.normas.${index}.value`)}
              placeholder="Ej: IEC 60601"
              className="w-full"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => (fields.length > 1 ? remove(index) : null)}
              disabled={fields.length <= 1}
            >
              <X className="h-4 w-4" />
            </Button>
            {index === fields.length - 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => append({ value: "" })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const OTCreate: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { isSubmitting, isDirty },
  } = useForm<OTCreateFormData>({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      status: "pendiente",
      type: "",
      client_id: undefined,
      contact_id: undefined,
      contract_type: "Contrato de Producción",
      product: "",
      brand: "",
      model: "",
      seal_number: "",
      certificate_expiry: "",
      estimated_delivery_date: "",
      observations: "",
      factura_ids: [],
      activities: [
        {
          activity: "",
          assigned_users: [],
          normas: [{ value: "" }],
          precio_sin_iva: "" as any,
          currency: "ARS",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activityOptions, setActivityOptions] = useState<ActivityPoint[]>([]);
  const [facturasCliente, setFacturasCliente] = useState<Factura[]>([]);
  const [idPreview, setIdPreview] = useState("AAMMDDN T CCCC");
  const [isIdLoading, setIsIdLoading] = useState(false);
  const [isCreateFacturaModalOpen, setCreateFacturaModalOpen] = useState(false);

  const watchedActivities = useWatch({ control, name: "activities" });
  const watchedIdFields = useWatch({
    control,
    name: ["date", "type", "client_id"],
  });
  const otType = watchedIdFields[1] as string;
  const selectedClientId = watchedIdFields[2] as number;

  const isLacreEnabled =
    otType === "Ensayo SE" ||
    otType === "Ensayo EE" ||
    otType === "Otros Servicios";

  useEffect(() => {
    if (otType === "Calibracion") {
      setValue("contract_type", "Contrato de Calibración");
    } else if (otType === "Ensayo SE" || otType === "Ensayo EE") {
      setValue("contract_type", "Contrato de Ensayo");
    } else {
      setValue("contract_type", "Contrato de Producción");
    }
  }, [otType, setValue]);

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        const [clientList, userList, contractList, activityList] =
          await Promise.all([
            clientService.getAllClients(),
            authService.getAllUsers(),
            contractService.getAllContracts(),
            adminService.getPuntajes(),
          ]);
        setClients(clientList);
        setUsers(userList);
        setContracts(contractList);
        setActivityOptions(activityList);
      } catch (error) {
        console.error("Error cargando datos para el formulario:", error);
      }
    };
    loadPrerequisites();
  }, []);

  const fetchClientFacturas = async (clientId: number) => {
    const facturas = await facturacionService.getFacturasByClienteId(clientId);
    setFacturasCliente(facturas);
  };

  useEffect(() => {
    const fetchClientData = async () => {
      if (selectedClientId) {
        const client = await clientService.getClientById(
          Number(selectedClientId)
        );
        setContacts(client.contacts);
        setValue("contact_id", undefined);
        fetchClientFacturas(Number(selectedClientId));
      } else {
        setContacts([]);
        setFacturasCliente([]);
      }
    };
    fetchClientData();
  }, [selectedClientId, setValue]);

  // --- START: LÓGICA DE ID PROGRESIVO CON FORMATO "AAMMDDN T CCCC" ---
  useEffect(() => {
    const [date, type, clientId] = watchedIdFields;

    const otTypeMap: { [key: string]: string } = {
      Produccion: "P",
      Calibracion: "C",
      "Ensayo SE": "S",
      "Ensayo EE": "E",
      "Otros Servicios": "O",
    };

    let datePart = "AAMMDD";
    let dailyOtPart = "N";
    let typePart = "T";
    let clientPart = "CCCC";

    if (date) {
      const d = new Date(date + "T00:00:00");
      const year = String(d.getFullYear()).slice(-2);
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      datePart = `${year}${month}${day}`;
    }

    if (type && otTypeMap[type as string]) {
      typePart = otTypeMap[type as string];
    }

    if (clientId) {
      clientPart = String(clientId).padStart(4, "0");
    }

    // Actualizar vista previa progresiva
    setIdPreview(`${datePart}${dailyOtPart} ${typePart} ${clientPart}`);

    // Llamada a la API solo cuando todos los campos están completos
    if (date && type && clientId) {
      setIsIdLoading(true);
      const params = new URLSearchParams({
        date: date as string,
        type: type as string,
        client_id: String(clientId),
      });

      axiosInstance
        .get(`/ots/generate-id?${params.toString()}`)
        .then((response) => {
          const fullId = response.data.previewId;

          if (fullId && typeof fullId === "string") {
            const sequentialNumber =
              fullId.split("-").pop()?.replace(/^0+/, "") || "N";
            const finalId = `${datePart}${sequentialNumber} ${typePart} ${clientPart}`;
            setIdPreview(finalId);
            setValue("custom_id", finalId);
          }
        })
        .catch((error) => {
          console.error("Error al generar el ID de OT:", error);
        })
        .finally(() => setIsIdLoading(false));
    } else {
      setValue("custom_id", "");
    }
  }, [watchedIdFields, setValue]);
  // --- END: LÓGICA DE ID PROGRESIVO ---

  useEffect(() => {
    const date = watchedIdFields[0];
    if (date && watchedActivities) {
      // @ts-ignore - Assuming calculateEstimatedDeliveryDate is robust enough
      const estimatedDate = calculateEstimatedDeliveryDate(
        watchedActivities,
        date as string
      );
      setValue("estimated_delivery_date", estimatedDate);
    }
  }, [watchedActivities, watchedIdFields, setValue]);

  const onSubmit = async (data: OTCreateFormData) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const dataToSubmit = {
        ...data,
        client_id: Number(data.client_id),
        contact_id: data.contact_id ? Number(data.contact_id) : undefined,
        created_by: user.id,
        // --- START: CORRECCIÓN DE ERROR "moneda" ---
        moneda: data.activities[0]?.currency || "ARS",
        // --- END: CORRECCIÓN DE ERROR "moneda" ---
        collaborator_observations: "",
        activities: data.activities.map((act) => ({
          ...act,
          assigned_users: (act.assigned_users || []).map((u: any) =>
            typeof u === "number" ? u : u.id
          ),
          normas: (act.normas || []).map((n: Norma) => n.value).filter(Boolean),
        })),
      };
      const newOt = await otService.createOT(dataToSubmit as any);
      navigate(`/ots/${newOt.id}`);
    } catch (error) {
      alert("Hubo un error al crear la Orden de Trabajo.");
      setIsSaving(false);
    }
  };

  const handleFacturaCreated = async (newFactura: { id: number }) => {
    if (typeof selectedClientId === "number") {
      await fetchClientFacturas(selectedClientId);
      const currentFacturaIds = getValues("factura_ids") || [];
      setValue("factura_ids", [...currentFacturaIds, newFactura.id], {
        shouldDirty: true,
      });
      setCreateFacturaModalOpen(false);
    } else {
      console.error(
        "ID de cliente no válido al intentar actualizar las facturas."
      );
    }
  };

  const getAvailableActivities = (currentIndex: number) => {
    const selectedActivities =
      watchedActivities?.map((act) => act.activity) || [];
    const currentActivity = watchedActivities?.[currentIndex]?.activity;
    return activityOptions.filter(
      (opt) =>
        !selectedActivities.includes(opt.activity) ||
        opt.activity === currentActivity
    );
  };

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

  return (
    <>
      <NavigationPrompt
        when={isDirty && !isSaving}
        onSave={handleSubmit(onSubmit)}
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              <Input
                label="Nº de Lacre"
                {...register("seal_number")}
                disabled={!isLacreEnabled}
              />
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
                                (u: User) => u.id
                              )}
                              onChange={(userIds: number[]) => {
                                const selectedUsers = userIds
                                  .map((id) => users.find((u) => u.id === id))
                                  .filter(Boolean) as User[];
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

export default OTCreate;
