// RUTA: /cliente/src/pages/OTdetail.tsx

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { otService, WorkOrder, Activity } from "../services/otService";
import { authService, User } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import {
  ArrowLeft,
  Save,
  Play,
  StopCircle,
  CheckSquare,
  XSquare,
  PlusCircle,
  Trash2,
  Download, // Ícono para exportar
} from "lucide-react";
import { mutate } from "swr";
import { exportOtToPdf } from "../services/pdfGenerator"; // Importamos la función

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

const OTDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, canViewAdminContent, canAuthorizeOT } = useAuth();
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { isSubmitting, isDirty },
  } = useForm<WorkOrder>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities" as never,
  });

  const [otData, setOtData] = useState<WorkOrder | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const watchedActivities = useWatch({ control, name: "activities" });
  const otType = useWatch({ control, name: "type" });
  const isLacreEnabled =
    otType === "Ensayo SE" ||
    otType === "Ensayo EE" ||
    otType === "Otros Servicios";

  // Logic to set default contract based on OT type
  useEffect(() => {
    if (otType === "Calibracion") {
      setValue("contract_type", "Contrato de Calibración", {
        shouldDirty: true,
      });
    } else if (otType === "Ensayo SE" || otType === "Ensayo EE") {
      setValue("contract_type", "Contrato de Ensayo", { shouldDirty: true });
    } else {
      setValue("contract_type", "Contrato General", { shouldDirty: true });
    }
  }, [otType, setValue]);

  const loadData = useCallback(async () => {
    if (id) {
      try {
        setError(null);
        const [ot, userList] = await Promise.all([
          otService.getOTById(Number(id)),
          canViewAdminContent()
            ? authService.getAllUsers()
            : Promise.resolve([]),
        ]);
        setOtData(ot);
        setUsers(userList);
        const formattedOt = {
          ...ot,
          date: ot.date ? new Date(ot.date).toISOString().split("T")[0] : "",
          certificate_expiry: ot.certificate_expiry
            ? new Date(ot.certificate_expiry).toISOString().split("T")[0]
            : "",
        };
        reset(formattedOt);
      } catch (err: any) {
        console.error("Error cargando datos de la OT:", err);
        setError("No se pudieron cargar los datos de la Orden de Trabajo.");
      }
    }
  }, [id, reset, canViewAdminContent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onSubmit = async (data: WorkOrder) => {
    try {
      const dataToSubmit = { ...data, role: user?.role };
      await otService.updateOT(Number(id), dataToSubmit);
      mutate(["/ots", user]);
      navigate("/ot");
    } catch (error: any) {
      alert(error.message || "Hubo un error al guardar los cambios.");
    }
  };

  const handleAuthorize = async () => {
    if (!id || !user) return;
    await otService.authorizeOT(Number(id), user.id);
    await loadData();
    mutate(["/ots", user]);
  };

  const handleDeauthorize = async () => {
    if (!id) return;
    await otService.deauthorizeOT(Number(id));
    await loadData();
    mutate(["/ots", user]);
  };

  const handleStartActivity = async (activityId: number) => {
    await otService.startActivity(activityId);
    await loadData();
  };

  const handleStopActivity = async (activityId: number) => {
    await otService.stopActivity(activityId);
    await loadData();
  };

  const handleExport = () => {
    if (otData) {
      exportOtToPdf(otData);
    }
  };

  if (error) return <div className="p-8 text-red-500 text-center">{error}</div>;
  if (!otData)
    return <div className="p-8 text-center">Cargando datos de la OT...</div>;

  const isEmployee = user?.role === "empleado";
  const isClosed = otData.status === "cierre";

  const isFormEditableForAdmin = canViewAdminContent() && !isClosed;

  const getAvailableActivities = (currentIndex: number) => {
    const selectedActivities =
      watchedActivities?.map((act: any) => act.activity) || [];
    const currentActivity = watchedActivities?.[currentIndex]?.activity;
    return activityOptions.filter(
      (opt) => !selectedActivities.includes(opt) || opt === currentActivity
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 bg-gray-50 dark:bg-gray-900 p-6 rounded-lg"
    >
      <div className="flex justify-between items-center">
        <Button type="button" variant="ghost" onClick={() => navigate("/ot")}>
          <ArrowLeft className="mr-2 h-5 w-5" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">
          Detalle de OT: {otData.custom_id || `#${otData.id}`}
        </h1>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={handleExport}>
            <Download className="mr-2 h-5 w-5" />
            Exportar a PDF
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !isDirty || (isEmployee && isClosed)}
          >
            <Save className="mr-2 h-5 w-5" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex flex-wrap justify-center items-center gap-4">
        {canAuthorizeOT() && !otData.authorized && (
          <Button
            type="button"
            onClick={handleAuthorize}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckSquare className="mr-2 h-5 w-5" /> Autorizar OT
          </Button>
        )}
        {canAuthorizeOT() &&
          otData.authorized &&
          otData.status === "pendiente" && (
            <Button type="button" onClick={handleDeauthorize} variant="danger">
              <XSquare className="mr-2 h-5 w-5" /> Desautorizar OT
            </Button>
          )}
      </div>

      <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 p-6 rounded-lg shadow-sm space-y-8">
        <fieldset disabled={!isFormEditableForAdmin}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-b dark:border-gray-700 pb-6">
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full">
              OT Seleccionada
            </h2>
            <Input label="Fecha" type="date" {...register("date")} />
            <div>
              <label className="text-sm font-medium dark:text-gray-300">
                Tipo de OT
              </label>
              <select
                {...register("type")}
                className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="Produccion">Producción</option>
                <option value="Calibracion">Calibración</option>
                <option value="Ensayo SE">Ensayo SE</option>
                <option value="Ensayo EE">Ensayo EE</option>
                <option value="Otros Servicios">Otros Servicios</option>
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
            <Input
              label="ID de OT"
              value={otData.custom_id || `Interno #${id}`}
              readOnly
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b dark:border-gray-700 pb-6">
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full">
              Información del Cliente
            </h2>
            <Input label="Empresa" value={otData.client_name} readOnly />
            <Input label="Nº Cliente" value={otData.client_code} readOnly />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b dark:border-gray-700 pb-6">
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full">
              Producto
            </h2>
            <Input label="Nombre" {...register("product")} />
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
                Observaciones (Generales)
              </label>
              <textarea
                {...register("observations")}
                className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                rows={3}
              ></textarea>
            </div>
          </div>
        </fieldset>

        <div className="border-b dark:border-gray-700 pb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              Actividades y Asignaciones
            </h2>
            {isFormEditableForAdmin && (
              <Button
                type="button"
                size="sm"
                onClick={() => append({ activity: "", assigned_to: null })}
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Agregar Actividad
              </Button>
            )}
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
                  disabled={!isFormEditableForAdmin}
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
                  disabled={!isFormEditableForAdmin}
                >
                  <option value="">Asignar a...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                {isFormEditableForAdmin && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {isEmployee &&
              otData.activities?.map((act: Activity) => (
                <div
                  key={act.id}
                  className="grid grid-cols-4 gap-4 items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md"
                >
                  <span className="font-medium">{act.activity}</span>
                  <span>{act.assigned_to_name || "No asignado"}</span>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      act.status === "finalizada"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {act.status.replace("_", " ")}
                  </span>
                  {user?.id === act.assigned_to && otData.authorized && (
                    <div className="flex gap-2">
                      {act.status === "pendiente" && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleStartActivity(act.id)}
                        >
                          <Play className="h-4 w-4 mr-1" /> Iniciar
                        </Button>
                      )}
                      {act.status === "en_progreso" && (
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => handleStopActivity(act.id)}
                        >
                          <StopCircle className="h-4 w-4 mr-1" /> Finalizar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="col-span-full">
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-4">
              Observaciones del Colaborador
            </h2>
            <textarea
              {...register("collaborator_observations")}
              disabled={!isEmployee || isClosed}
              className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              rows={4}
              placeholder={
                isEmployee
                  ? "Añade tus observaciones aquí..."
                  : "Visible para el empleado asignado..."
              }
            ></textarea>
          </div>

          {canViewAdminContent() && (
            <div className="col-span-full">
              <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-4">
                Administración
              </h2>
              <fieldset
                disabled={!isFormEditableForAdmin}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <Input
                  label="Cotización (Detalles)"
                  {...register("quotation_details")}
                />
                <Input
                  label="Cotización (Monto)"
                  type="number"
                  step="0.01"
                  {...register("quotation_amount")}
                />
                <Input label="Disposición" {...register("disposition")} />
                <div>
                  <label className="text-sm font-medium dark:text-gray-300">
                    Estado Final
                  </label>
                  <select
                    {...register("status")}
                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En Progreso</option>
                    <option value="finalizada">Finalizada</option>
                    <option value="facturada">Facturada</option>
                    <option value="cierre">Cierre</option>
                  </select>
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

export default OTDetail;
