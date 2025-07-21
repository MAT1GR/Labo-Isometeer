// RUTA: /cliente/src/pages/OTCreate.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { otService, WorkOrder } from "../services/otService";
import { clientService, Client } from "../services/clientService";
import { authService, User } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { ArrowLeft, Save } from "lucide-react";

type OTCreateFormData = Omit<
  WorkOrder,
  | "id"
  | "created_at"
  | "updated_at"
  | "client_name"
  | "client_code"
  | "client_contact"
  | "assigned_to_name"
  | "items"
  | "invoices"
  | "receipts"
>;

const OTCreate: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<OTCreateFormData>({
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      status: "pendiente",
    },
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);

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
      navigate(`/ot/editar/${newOt.id}`); // Redirige a la edición de la nueva OT
    } catch (error) {
      console.error("Error al crear la OT:", error);
      alert("Hubo un error al crear la Orden de Trabajo.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 bg-gray-50 p-6 rounded-lg"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          Crear Nueva Orden de Trabajo
        </h1>
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

      <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-b pb-6">
          <h2 className="text-lg font-semibold text-blue-700 col-span-full">
            Detalles Generales
          </h2>
          <Input
            label="Fecha *"
            type="date"
            {...register("date", { required: true })}
          />
          <Input
            label="Tipo de OT *"
            {...register("type", { required: true })}
          />
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">
              Cliente *
            </label>
            <select
              {...register("client_id", { required: true })}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input label="Contrato" {...register("contract")} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b pb-6">
          <h2 className="text-lg font-semibold text-blue-700 col-span-full">
            Producto
          </h2>
          <Input
            label="Nombre *"
            {...register("product", { required: true })}
          />
          <Input label="Marca" {...register("brand")} />
          <Input label="Modelo" {...register("model")} />
          <Input label="Nº de Lacre" {...register("seal_number")} />
          <Input
            label="Vto. del Certificado"
            type="date"
            {...register("certificate_expiry")}
          />
          <div className="col-span-full">
            <label className="text-sm font-medium">Observaciones</label>
            <textarea
              {...register("observations")}
              className="w-full mt-1 p-2 border rounded-md"
              rows={3}
            ></textarea>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold text-blue-700 mb-4">
              Actividades
            </h2>
            <label className="text-sm font-medium text-gray-700">
              Asignar a
            </label>
            <select
              {...register("assigned_to")}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="">Sin asignar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </form>
  );
};

export default OTCreate;
