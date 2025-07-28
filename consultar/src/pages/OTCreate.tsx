// RUTA: /cliente/src/pages/OTCreate.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { otService, WorkOrder } from "../services/otService";
import { clientService, Client } from "../services/clientService";
import { authService, User } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { ArrowLeft, Save } from "lucide-react";
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

const OTCreate: React.FC = () => {
  const { user, canViewAdminContent } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    control,
    setValue, // <--- AÑADIDO
    formState: { isSubmitting },
  } = useForm<OTCreateFormData>({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      status: "pendiente",
    },
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [idPreview, setIdPreview] = useState("Completar campos...");

  const watchedFields = useWatch({
    control,
    name: ["date", "type", "client_id"],
  });
  const otType = watchedFields[1];
  const isLacreEnabled =
    otType === "Ensayo SE" ||
    otType === "Ensayo EE" ||
    otType === "Otros Servicios";

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

  // --- LÓGICA PARA GENERAR ID AUTOMÁTICO ---
  useEffect(() => {
    const [date, type, clientId] = watchedFields;
    if (date && type && clientId) {
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
          setValue("custom_id", newId); // Guarda el ID en el formulario
        });
    } else {
      setIdPreview("Completar campos...");
    }
  }, [watchedFields, setValue]);

  const onSubmit = async (data: OTCreateFormData) => {
    if (!user) return;
    try {
      const dataToSubmit = {
        ...data,
        client_id: Number(data.client_id),
        assigned_to: data.assigned_to ? Number(data.assigned_to) : null,
        created_by: user.id,
      };
      const newOt = await otService.createOT(dataToSubmit);
      navigate(`/ot/editar/${newOt.id}`);
    } catch (error) {
      alert("Hubo un error al crear la Orden de Trabajo.");
    }
  };

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
          <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 col-span-full">
            OT Seleccionada
          </h2>
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
              <option value="Produccion">Producción</option>
              <option value="Calibracion">Calibración</option>
              <option value="Ensayo SE">Ensayo SE</option>
              <option value="Ensayo EE">Ensayo EE</option>
              <option value="Otros Servicios">Otros Servicios</option>
            </select>
          </div>
          <Input label="ID de OT" value={idPreview} disabled readOnly />
          <div>
            <label className="text-sm font-medium dark:text-gray-300">
              Contrato
            </label>
            <select
              {...register("contract")}
              className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Ninguno</option>
              <option value="Calibracion">Calibración</option>
              <option value="Completo">Completo</option>
              <option value="Ampliado">Ampliado</option>
              <option value="Refurbished">Refurbished</option>
              <option value="Fabricacion">Fabricación</option>
              <option value="Verificacion de identidad">
                Verificación de Identidad
              </option>
              <option value="Reducido">Reducido</option>
              <option value="Servicio tecnico">Servicio Técnico</option>
              <option value="Capacitacion">Capacitación</option>
            </select>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-4">
              Actividades
            </h2>
            <label className="text-sm font-medium dark:text-gray-300">
              Asignar a
            </label>
            <select
              {...register("assigned_to", { valueAsNumber: true })}
              className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Sin asignar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          {canViewAdminContent() && (
            <div>
              <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-4">
                Administración
              </h2>
              <div className="space-y-4">
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
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

export default OTCreate;
