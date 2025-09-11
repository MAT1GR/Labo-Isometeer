// RUTA: /consultar/src/hooks/useOTCreateForm.ts

import { useState, useEffect } from "react";
import { useForm, useWatch, useFieldArray } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { otService, WorkOrder, Activity } from "../services/otService";
import { clientService, Client, Contact } from "../services/clientService";
import { authService, User } from "../services/auth";
import { contractService, Contract } from "../services/contractService";
import { adminService, ActivityPoint } from "../services/adminService";
import { facturacionService, Factura } from "../services/facturacionService";
import { useAuth } from "../contexts/AuthContext";
import axiosInstance from "../api/axiosInstance";
import { calculateEstimatedDeliveryDate } from "../lib/utils";

// --- Interfaces ---
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

export type OTCreateFormData = Omit<
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
  seal_entity?: string;
  type: string;
  contract_type: string;
  product: string;
  brand: string;
  model: string;
  seal_number: string;
  certificate_expiry: string;
  observations: string;
};

// --- Custom Hook ---
export const useOTCreateForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const formMethods = useForm<OTCreateFormData>({
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
      seal_entity: "",
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

  const { control, setValue, getValues, handleSubmit } = formMethods;

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
  }) as [string, string, number];
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

    setIdPreview(`${datePart}${dailyOtPart} ${typePart} ${clientPart}`);

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

  useEffect(() => {
    const date = watchedIdFields[0];
    if (date && watchedActivities) {
      // @ts-ignore
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
      const fullSealNumber = data.seal_entity
        ? `${data.seal_entity} - ${data.seal_number}`
        : data.seal_number;

      const dataToSubmit = {
        ...data,
        seal_number: fullSealNumber,
        client_id: Number(data.client_id),
        contact_id: data.contact_id ? Number(data.contact_id) : undefined,
        created_by: user.id,
        moneda: data.activities[0]?.currency || "ARS",
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

  return {
    formMethods,
    isSaving,
    clients,
    contacts,
    users,
    contracts,
    activityOptions,
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
    onSubmit: handleSubmit(onSubmit),
    handleFacturaCreated,
    getAvailableActivities,
  };
};
