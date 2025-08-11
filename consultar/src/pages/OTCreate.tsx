// RUTA: /cliente/src/pages/OTCreate.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch, useFieldArray, Controller } from "react-hook-form";
import { otService, WorkOrder } from "../services/otService";
import { clientService, Client, Contact } from "../services/clientService";
import { authService, User } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import {
  ArrowLeft,
  Save,
  PlusCircle,
  Trash2,
  Loader,
  UserSquare,
  Package,
  ClipboardList,
  BookText,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import MultiUserSelect from "../components/ui/MultiUserSelect";
import { calculateEstimatedDeliveryDate } from "../lib/utils";
import ClienteSelect from "../components/ui/ClienteSelect";
import Card from "../components/ui/Card";

type OTCreateFormData = Omit<
  WorkOrder,
  | "id"
  | "created_at"
  | "updated_at"
  | "client_name"
  | "client_code"
  | "assigned_to_name"
>;

const activityOptions = [
  "Calibracion",
  "Completo",
  "Ampliado",
  "Refurbished",
  "Fabricacion",
  "Verificacion de identidad",
  "Reducido",
  "Servicio tecnico",
  "Capacitacion",
];

const OTCreate: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<OTCreateFormData>({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      status: "pendiente",
      activities: [
        { activity: "", assigned_to: [], norma: "", precio_sin_iva: undefined },
      ],
      contract_type: "Contrato de Producción",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities" as never,
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [idPreview, setIdPreview] = useState("Completar campos...");
  const [isIdLoading, setIsIdLoading] = useState(false);

  const watchedActivities = useWatch({ control, name: "activities" });
  const watchedIdFields = useWatch({
    control,
    name: ["date", "type", "client_id"],
  });
  const otType = watchedIdFields[1];
  const selectedClientId = watchedIdFields[2];

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
        const [clientList, userList] = await Promise.all([
          clientService.getAllClients(),
          authService.getAllUsers(),
        ]);
        setClients(clientList);
        setUsers(userList);
      } catch (error) {
        console.error("Error cargando datos para el formulario:", error);
      }
    };
    loadPrerequisites();
  }, []);

  useEffect(() => {
    const fetchContacts = async () => {
      if (selectedClientId) {
        const client = await clientService.getClientById(
          Number(selectedClientId)
        );
        setContacts(client.contacts);
        setValue("contact_id", undefined);
      } else {
        setContacts([]);
      }
    };
    fetchContacts();
  }, [selectedClientId, setValue]);

  useEffect(() => {
    const [date, type, clientId] = watchedIdFields;

    if (date && type && clientId) {
      setIsIdLoading(true);
      const params = new URLSearchParams({
        date,
        type,
        client_id: String(clientId),
      });
      axiosInstance
        .get(`/ots/generate-id?${params.toString()}`)
        .then((response) => {
          const newId = response.data.previewId;
          setIdPreview(newId);
          setValue("custom_id", newId);
        })
        .finally(() => setIsIdLoading(false));
    } else {
      setIdPreview("Completar campos...");
    }
  }, [watchedIdFields, setValue]);

  useEffect(() => {
    const date = watchedIdFields[0];
    const activities = watchedActivities as { activity: string }[];
    if (date && activities) {
      const estimatedDate = calculateEstimatedDeliveryDate(activities, date);
      setValue("estimated_delivery_date", estimatedDate);
    }
  }, [watchedActivities, watchedIdFields, setValue]);

  const onSubmit = async (data: any) => {
    if (!user) return;
    try {
      const dataToSubmit = {
        ...data,
        client_id: Number(data.client_id),
        contact_id: data.contact_id ? Number(data.contact_id) : undefined,
        created_by: user.id,
        collaborator_observations: "",
      };
      const newOt = await otService.createOT(dataToSubmit);
      navigate(`/ot/editar/${newOt.id}`);
    } catch (error) {
      alert("Hubo un error al crear la Orden de Trabajo.");
    }
  };

  const getAvailableActivities = (currentIndex: number) => {
    const selectedActivities =
      watchedActivities?.map((act: any) => act.activity) || [];
    const currentActivity = watchedActivities?.[currentIndex]?.activity;
    return activityOptions.filter(
      (opt) => !selectedActivities.includes(opt) || opt === currentActivity
    );
  };

  const otTypes = [
    { value: "Produccion", label: "Producción" },
    { value: "Calibracion", label: "Calibración" },
    { value: "Ensayo SE", label: "Ensayo SE" },
    { value: "Ensayo EE", label: "Ensayo EE" },
    { value: "Otros Servicios", label: "Otros Servicios" },
  ];

  return (
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
                <option value="Contrato de Producción">
                  Contrato de Producción
                </option>
                <option value="Contrato de Calibración">
                  Contrato de Calibración
                </option>
                <option value="Contrato de Ensayo">Contrato de Ensayo</option>
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
                  onChange={field.onChange}
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
                  assigned_to: [],
                  norma: "",
                  precio_sin_iva: undefined,
                })
              }
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Agregar Actividad
            </Button>
          </div>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr,auto] gap-4 items-start">
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
                        <option key={opt} value={opt}>
                          {opt}
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
                      name={`activities.${index}.assigned_to` as any}
                      render={({ field }) => (
                        <MultiUserSelect
                          users={users}
                          selectedUserIds={field.value || []}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                  <div className="self-end">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Norma"
                    {...register(`activities.${index}.norma`)}
                    placeholder="Ej: IEC 60601"
                  />
                  <Input
                    label="Precio (Sin IVA)"
                    type="number"
                    step="0.01"
                    {...register(`activities.${index}.precio_sin_iva`, {
                      valueAsNumber: true,
                    })}
                    placeholder="Ej: 15000"
                  />
                </div>
              </div>
            ))}
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
  );
};

export default OTCreate;
