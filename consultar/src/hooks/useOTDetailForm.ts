// RUTA: /consultar/src/hooks/useOTDetailForm.ts

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { otService, WorkOrder, Activity } from "../services/otService";
import { authService, User } from "../services/auth";
import { contractService, Contract } from "../services/contractService";
import { adminService, ActivityPoint } from "../services/adminService";
import { facturacionService, Factura } from "../services/facturacionService";
import { useAuth } from "../contexts/AuthContext";
import { mutate } from "swr";
import { calculateEstimatedDeliveryDate } from "../lib/utils";

export const useOTDetailForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, canViewAdminContent, canAuthorizeOT } = useAuth();

  const formMethods = useForm<WorkOrder>({
    defaultValues: {
      moneda: "ARS",
    },
  });

  const { control, reset, setValue, getValues, handleSubmit } = formMethods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities" as never,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [otData, setOtData] = useState<WorkOrder | null>(null);
  const [dataForExport, setDataForExport] = useState<WorkOrder | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [activityOptions, setActivityOptions] = useState<ActivityPoint[]>([]);
  const [facturasCliente, setFacturasCliente] = useState<Factura[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCreateFacturaModalOpen, setCreateFacturaModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const toggleIsEditing = () => {
    setIsEditing(prev => !prev);
  };

  const watchedActivities = useWatch({ control, name: "activities" });
  const otType = useWatch({ control, name: "type" });
  const otDate = useWatch({ control, name: "date" });
  const otMoneda = useWatch({ control, name: "moneda" });

  const isLacreEnabled =
    otType === "Ensayo SE" ||
    otType === "Ensayo EE" ||
    otType === "Otros Servicios";

  const isEmployee = user?.role === "empleado";

  const myActivities = useMemo(() => {
    if (isEmployee && otData?.activities && user) {
      return otData.activities.filter((act) =>
        act.assigned_users?.some((u: User) => u.id === user.id)
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

  const loadData = useCallback(async () => {
    if (id) {
      try {
        setError(null);
        const [ot, userList, contractList, activityList] = await Promise.all([
          otService.getOTById(Number(id)),
          canViewAdminContent()
            ? authService.getAllUsers()
            : Promise.resolve([]),
          contractService.getAllContracts(),
          adminService.getPuntajes(),
        ]);
        setOtData(ot);
        setUsers(userList);
        setContracts(contractList);
        setActivityOptions(activityList);

        if (ot.client_id) {
          const facturas = await facturacionService.getFacturasByClienteId(
            ot.client_id
          );
          setFacturasCliente(facturas);
        }

        const formattedOt = {
          ...ot,
          date: ot.date ? new Date(ot.date).toISOString().split("T")[0] : "",
          certificate_expiry: ot.certificate_expiry
            ? new Date(ot.certificate_expiry).toISOString().split("T")[0]
            : "",
          estimated_delivery_date: ot.estimated_delivery_date
            ? new Date(ot.estimated_delivery_date).toISOString().split("T")[0]
            : "",
          // Se asegura que `assigned_users` esté presente en los datos del formulario
          activities: ot.activities?.map((act) => ({
            ...act,
            assigned_users: act.assigned_users || [],
          })),
        };
        reset(formattedOt as WorkOrder);
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
    if (!user || !id) return;
    setIsSaving(true);
    try {
      const dataToSubmit = {
        ...data,
        user_id: user.id,
        role: user.role,
        contact_id: data.contact_id ? Number(data.contact_id) : undefined,
        // Asegura que el backend reciba el formato correcto
        activities: data.activities?.map((act) => ({
          ...act,
          assigned_to: (act.assigned_users || []).map((u: User) => u.id),
        })),
      };
      await otService.updateOT(Number(id), dataToSubmit);
      mutate(["/ot", user]);
      navigate("/ot");
    } catch (error: any) {
      alert(error.message || "Hubo un error al guardar los cambios.");
      setIsSaving(false);
    }
  };

  // --- FUNCIÓN CORREGIDA Y CENTRALIZADA AQUÍ ---
  // Esta es la función clave que soluciona el problema de guardado.
  const handleActivityAssignmentChange = (index: number, userIds: number[]) => {
    // Busca los objetos de usuario completos a partir de los IDs
    const selectedUsers = users.filter((u) => userIds.includes(u.id));
    // Actualiza el campo 'assigned_users' en el estado del formulario para la actividad correcta
    setValue(`activities.${index}.assigned_users`, selectedUsers as any, {
      shouldDirty: true, // Marca el formulario como modificado
      shouldValidate: true, // Activa la validación si es necesario
    });
  };

  const handleFacturaCreated = () => {
    setCreateFacturaModalOpen(false);
    loadData();
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
    mutate(["/ot", user]);
  };

  const handleDeauthorize = async () => {
    if (!id || !user) return;
    await otService.deauthorizeOT(Number(id), user.id);
    await loadData();
    mutate(["/ot", user]);
  };

  const handleCloseOT = async () => {
    if (!id || !user) return;
    try {
      await otService.closeOT(Number(id), user.id);
      await loadData();
      mutate(["/ot", user]);
    } catch (error: any) {
      alert(error.response?.data?.error || "Hubo un error al cerrar la OT.");
    }
  };

  const handleStartActivity = async (activityId: number) => {
    if (!user) return;
    await otService.startActivity(activityId, user.id);
    await loadData();
  };

  const handleStopActivity = async (activityId: number) => {
    if (!user) return;
    await otService.stopActivity(activityId, user.id);
    await loadData();
  };

  const getAvailableActivities = (currentIndex: number) => {
    const selectedActivities =
      watchedActivities?.map((act: any) => act.activity) || [];
    const currentActivity = watchedActivities?.[currentIndex]?.activity;
    return activityOptions.filter(
      (opt) =>
        !selectedActivities.includes(opt.activity) ||
        opt.activity === currentActivity
    );
  };

  return {
    id,
    user,
    formMethods,
    isSaving,
    otData,
    dataForExport,
    users,
    contracts,
    activityOptions,
    facturasCliente,
    error,
    isExportModalOpen,
    isCreateFacturaModalOpen,
    isHistoryModalOpen,
    isLacreEnabled,
    isEmployee,
    myActivities,
    isFormEditable,
    isEditing,
    otMoneda,
    fields,
    canAuthorizeOT,
    append,
    remove,
    setCreateFacturaModalOpen,
    setIsExportModalOpen,
    setIsHistoryModalOpen,
    toggleIsEditing,
    onSubmit: handleSubmit(onSubmit),
    handleFacturaCreated,
    handleOpenExportModal,
    handleAuthorize,
    handleDeauthorize,
    handleCloseOT,
    handleStartActivity,
    handleStopActivity,
    getAvailableActivities,
    handleActivityAssignmentChange, // Se exporta la función para que el formulario la use
    loadData,
  };
};
