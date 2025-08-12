// RUTA: /cliente/src/pages/OTdetail.tsx

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, useWatch, useFieldArray, Controller } from "react-hook-form";
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
  Download,
  Clock,
  CalendarCheck,
  Lock,
  Archive,
  UserSquare,
  Package,
  ClipboardList,
  BookText
} from "lucide-react";
import { mutate } from "swr";
import { formatDateTime, calculateEstimatedDeliveryDate } from "../lib/utils";
import MultiUserSelect from "../components/ui/MultiUserSelect";
import ExportOtModal from "../components/ui/ExportOtModal";
import Card from "../components/ui/Card";

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
    getValues,
    formState: { isSubmitting, isDirty },
  } = useForm<WorkOrder>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities" as never,
  });

  const [otData, setOtData] = useState<WorkOrder | null>(null);
  const [dataForExport, setDataForExport] = useState<WorkOrder | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const watchedActivities = useWatch({ control, name: "activities" });
  const otType = useWatch({ control, name: "type" });
  const otDate = useWatch({ control, name: "date" });
  const isLacreEnabled =
    otType === "Ensayo SE" ||
    otType === "Ensayo EE" ||
    otType === "Otros Servicios";

  const isEmployee = user?.role === "empleado";

  const myActivities = useMemo(() => {
    if (isEmployee && otData?.activities) {
      return otData.activities.filter((act) =>
        act.assigned_users?.some((u) => u.id === user.id)
      );
    }
    return [];
  }, [otData, user, isEmployee]);

  const isOtStartedOrLater = useMemo(() => {
    if (!otData) return false;
    const startedStatuses = [
      "en_progreso",
      "finalizada",
      "facturada",
      "cerrada",
    ];
    return startedStatuses.includes(otData.status);
  }, [otData]);

  const isFormEditable = canViewAdminContent() && !isOtStartedOrLater;

  useEffect(() => {
    if (otType === "Calibracion") {
      setValue("contract_type", "Contrato de Calibración", {
        shouldDirty: true,
      });
    } else if (otType === "Ensayo SE" || otType === "Ensayo EE") {
      setValue("contract_type", "Contrato de Ensayo", { shouldDirty: true });
    } else {
      setValue("contract_type", "Contrato de Producción", {
        shouldDirty: true,
      });
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
          estimated_delivery_date: ot.estimated_delivery_date
            ? new Date(ot.estimated_delivery_date).toISOString().split("T")[0]
            : "",
          activities: ot.activities?.map((act) => ({
            ...act,
            assigned_to: act.assigned_users?.map((u) => u.id) || [],
          })),
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

  useEffect(() => {
    const activities = watchedActivities as Activity[];
    if (otDate && activities && isFormEditable) {
      if (!getValues("estimated_delivery_date")) {
        const estimatedDate = calculateEstimatedDeliveryDate(
          activities,
          otDate
        );
        setValue("estimated_delivery_date", estimatedDate, {
          shouldDirty: true,
        });
      }
    }
  }, [watchedActivities, otDate, isFormEditable, setValue, getValues]);

  const onSubmit = async (data: WorkOrder) => {
    try {
      const dataToSubmit = {
        ...data,
        role: user?.role,
        contact_id: data.contact_id ? Number(data.contact_id) : undefined,
      };
      await otService.updateOT(Number(id), dataToSubmit);
      mutate(["/ots", user]);
      navigate("/ot");
    } catch (error: any) {
      alert(error.message || "Hubo un error al guardar los cambios.");
    }
  };

  const handleOpenExportModal = () => {
    const currentFormData = getValues();
    const exportData = {
      ...otData,
      ...currentFormData,
    } as WorkOrder;
    setDataForExport(exportData);
    setIsExportModalOpen(true);
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
  
  const handleCloseOT = async () => {
    if (!id || !user) return;
    try {
      await otService.closeOT(Number(id), user.id);
      await loadData();
      mutate(["/ots", user]);
    } catch (error: any) {
      alert(error.response?.data?.error || "Hubo un error al cerrar la OT.");
    }
  };

  const handleStartActivity = async (activityId: number) => {
    await otService.startActivity(activityId);
    await loadData();
  };

  const handleStopActivity = async (activityId: number) => {
    await otService.stopActivity(activityId);
    await loadData();
  };

  if (error) return <div className="p-8 text-red-500 text-center">{error}</div>;
  if (!otData)
    return <div className="p-8 text-center">Cargando datos de la OT...</div>;

  const getAvailableActivities = (currentIndex: number) => {
    const selectedActivities =
      watchedActivities?.map((act: any) => act.activity) || [];
    const currentActivity = watchedActivities?.[currentIndex]?.activity;
    return activityOptions.filter(
      (opt) => !selectedActivities.includes(opt) || opt === currentActivity
    );
  };

  return (
    <>
      <ExportOtModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        otData={dataForExport}
      />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <div className="flex justify-between items-center flex-wrap gap-4">
          <Button type="button" variant="ghost" onClick={() => navigate("/ot")}>
            <ArrowLeft className="mr-2 h-5 w-5" />
            Volver
          </Button>
          <h1 className="text-2xl font-bold text-center">
            Detalle de OT: {otData.custom_id || `#${otData.id}`}
          </h1>
          <div className="flex gap-2 flex-wrap">
            {!isEmployee && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleOpenExportModal}
              >
                <Download className="mr-2 h-5 w-5" />
                Exportar PDF
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              <Save className="mr-2 h-5 w-5" />
              Guardar
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
              <Button
                type="button"
                onClick={handleDeauthorize}
                variant="danger"
              >
                <XSquare className="mr-2 h-5 w-5" /> Desautorizar OT
              </Button>
            )}
          {user?.role === "director" && otData.status === "finalizada" && (
            <Button
              type="button"
              onClick={handleCloseOT}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Archive className="mr-2 h-5 w-5" /> Cerrar OT
            </Button>
          )}
        </div>

        {isEmployee && myActivities.length > 0 && (
          <Card>
            <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
                <ClipboardList size={20} /> Mis Tareas en esta OT
            </h2>
            <div className="space-y-4">
              {myActivities.map((activity) => {
                const statusColor = activity.status === 'finalizada' ? 'border-green-500' : activity.status === 'en_progreso' ? 'border-blue-500' : 'border-yellow-500';
                return (
                <div
                  key={activity.id}
                  className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 ${statusColor} flex flex-col md:flex-row md:items-center justify-between gap-4`}
                >
                  <div className="flex-1">
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-100">{activity.activity}</p>
                    <div className="flex items-center gap-6 text-xs mt-2 text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          Inicio: <strong>{formatDateTime(activity.started_at) || "N/A"}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4" />
                        <span>
                          Fin: <strong>{formatDateTime(activity.completed_at) || "N/A"}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        activity.status === "finalizada"
                          ? "bg-green-100 text-green-800"
                          : activity.status === "en_progreso"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {activity.status.replace("_", " ")}
                    </span>
                    {otData.authorized && (
                      <>
                        {activity.status === "pendiente" && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStartActivity(activity.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4 mr-1" /> Iniciar
                          </Button>
                        )}
                        {activity.status === "en_progreso" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => handleStopActivity(activity.id)}
                          >
                            <StopCircle className="h-4 w-4 mr-1" /> Finalizar
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )})}
            </div>
          </Card>
        )}

        {canViewAdminContent() && isOtStartedOrLater && (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Lock className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-200">
                  La edición de los datos principales está bloqueada porque la
                  OT ya se encuentra "{otData.status.replace("_", " ")}".
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
            <Card>
                <fieldset disabled={!isFormEditable}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                            <option value="Contrato de Producción">
                                Contrato de Producción
                            </option>
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
                </fieldset>
            </Card>

            <Card>
                <fieldset disabled={!isFormEditable}>
                    <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full mb-4 flex items-center gap-2">
                        <UserSquare size={20} /> Información del Cliente
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Empresa" value={otData.client?.name} readOnly />
                        <Input label="Nº Cliente" value={otData.client?.code} readOnly />
                        <div className="col-span-full">
                            <label className="text-sm font-medium dark:text-gray-300">
                            Referente
                            </label>
                            <select
                            {...register("contact_id")}
                            disabled={!isFormEditable}
                            className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            >
                            <option value="">Seleccionar referente...</option>
                            {otData.client?.contacts?.map((c) => (
                                <option key={c.id} value={c.id}>
                                {c.name} ({c.type})
                                </option>
                            ))}
                            </select>
                        </div>
                    </div>
                </fieldset>
            </Card>

            <Card>
                <fieldset disabled={!isFormEditable}>
                    <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full mb-4 flex items-center gap-2">
                        <Package size={20} /> Producto
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Nombre *" {...register("product")} />
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
                </fieldset>
            </Card>
            
            {!isEmployee && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                            <ClipboardList size={20} /> Actividades y Asignaciones
                        </h2>
                        {isFormEditable && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => append({ activity: "", assigned_to: [] })}
                        >
                            <PlusCircle className="h-4 w-4 mr-2" /> Agregar Actividad
                        </Button>
                        )}
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
                                disabled={!isFormEditable}
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
                                    disabled={!isFormEditable}
                                    />
                                )}
                                />
                            </div>
                            {isFormEditable && (
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
                            )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Norma"
                                {...register(`activities.${index}.norma`)}
                                disabled={!isFormEditable}
                                placeholder="Ej: IEC 60601"
                            />
                            <Input
                                label="Precio (Sin IVA)"
                                type="number"
                                step="0.01"
                                {...register(`activities.${index}.precio_sin_iva`, {
                                valueAsNumber: true,
                                })}
                                disabled={!isFormEditable}
                                placeholder="Ej: 15000"
                            />
                            </div>
                        </div>
                        ))}
                    </div>
                </Card>
            )}

            <Card>
                <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full mb-4 flex items-center gap-2">
                    <BookText size={20}/> Observaciones
                </h2>
                <div>
                <label className="text-sm font-medium dark:text-gray-300">
                    Observaciones Generales (visibles para el cliente)
                </label>
                <textarea
                    {...register("observations")}
                    disabled={!isFormEditable}
                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                    rows={4}
                ></textarea>
                </div>
                <div className="mt-4">
                <label className="text-sm font-medium dark:text-gray-300">
                    Observaciones del Colaborador (uso interno)
                </label>
                <textarea
                    {...register("collaborator_observations")}
                    disabled={!canViewAdminContent()}
                    className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                    rows={4}
                    placeholder={
                    isEmployee
                        ? "Añade tus observaciones aquí..."
                        : "Campo de uso exclusivo para el empleado asignado."
                    }
                ></textarea>
                </div>
            </Card>
        </div>
      </form>
    </>
  );
};

export default OTDetail;