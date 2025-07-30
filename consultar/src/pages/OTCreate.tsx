import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { otService, WorkOrder } from "../services/otService";
import { clientService, Client } from "../services/clientService";
import { authService, User } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { ArrowLeft, Save, PlusCircle, Trash2, Loader } from "lucide-react";
import axiosInstance from "../api/axiosInstance";

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
  const { user, canViewAdminContent } = useAuth();
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
      activities: [{ activity: "", assigned_to: null }],
      contract_type: "Contrato General",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities" as never,
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [idPreview, setIdPreview] = useState("Completar campos...");
  const [isIdLoading, setIsIdLoading] = useState(false);

  const watchedActivities = useWatch({ control, name: "activities" });
  const watchedIdFields = useWatch({
    control,
    name: ["date", "type", "client_id"],
  });
  const otType = watchedIdFields[1];
  const isLacreEnabled =
    otType === "Ensayo SE" ||
    otType === "Ensayo EE" ||
    otType === "Otros Servicios";

  // Logic to set default contract based on OT type
  useEffect(() => {
    if (otType === "Calibracion") {
      setValue("contract_type", "Contrato de Calibración");
    } else if (otType === "Ensayo SE" || otType === "Ensayo EE") {
      setValue("contract_type", "Contrato de Ensayo");
    } else {
      setValue("contract_type", "Contrato General");
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

  const onSubmit = async (data: any) => {
    if (!user) return;
    try {
      const dataToSubmit = {
        ...data,
        client_id: Number(data.client_id),
        created_by: user.id,
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 bg-gray-50 dark:bg-gray-900 p-6 rounded-lg"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Crear Nueva Orden de Trabajo</h1>
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

      <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 p-6 rounded-lg shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-b dark:border-gray-700 pb-6">
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
              <option value="Contrato General">Contrato General</option>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b dark:border-gray-700 pb-6">
          <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full">
            Información del Cliente
          </h2>
          <div>
            <label className="text-sm font-medium dark:text-gray-300">
              Empresa (Nº Cliente) *
            </label>
            <select
              {...register("client_id", {
                required: true,
                valueAsNumber: true,
              })}
              className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b dark:border-gray-700 pb-6">
          <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full">
            Producto
          </h2>
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
          <div className="col-span-full">
            <label className="text-sm font-medium dark:text-gray-300">
              Observaciones
            </label>
            <textarea
              {...register("observations")}
              className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              rows={3}
            ></textarea>
          </div>
        </div>

        <div className="border-b dark:border-gray-700 pb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              Actividades y Asignaciones
            </h2>
            <Button
              type="button"
              size="sm"
              onClick={() => append({ activity: "", assigned_to: null })}
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Agregar Actividad
            </Button>
          </div>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md"
              >
                <select
                  {...register(`activities.${index}.activity`)}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Seleccionar actividad...</option>
                  {getAvailableActivities(index).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  {...register(`activities.${index}.assigned_to`)}
                  className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">Asignar a...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {canViewAdminContent() && (
          <div>
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-4">
              Administración
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Cotización (Detalles)"
                {...register("quotation_details")}
              />
              <Input
                label="Cotización (Monto)"
                type="number"
                step="0.01"
                {...register("quotation_amount", { valueAsNumber: true })}
              />
              <Input label="Disposición" {...register("disposition")} />
            </div>
          </div>
        )}
      </div>
    </form>
  );
};

export default OTCreate;
