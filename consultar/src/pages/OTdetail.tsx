// RUTA: /cliente/src/pages/OTDetail.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { otService, WorkOrder } from "../services/otService";
import { authService, User } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { ArrowLeft, Save } from "lucide-react";

const OTDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDirectorOrAdmin } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<WorkOrder>();
  const [otData, setOtData] = useState<WorkOrder | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (id) {
        try {
          const [ot, userList] = await Promise.all([
            otService.getOTById(Number(id)),
            authService.getAllUsers(),
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
        } catch (error) {
          console.error("Error cargando datos de la OT:", error);
        }
      }
    };
    fetchData();
  }, [id, reset]);

  const onSubmit = async (data: WorkOrder) => {
    try {
      await otService.updateOT(Number(id), data);
      navigate("/ot");
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar los cambios.");
    }
  };

  if (!otData) {
    return <div className="p-8">Cargando datos de la Orden de Trabajo...</div>;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 bg-gray-50 p-6 rounded-lg"
    >
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/ot")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          Volver a la Lista
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">
          Editando Orden de Trabajo
        </h1>
        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="flex items-center gap-2"
        >
          <Save className="h-5 w-5" />
          {isSubmitting ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm space-y-8">
        {/* --- SECCIÓN OT SELECCIONADA --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-b pb-6">
          <h2 className="text-lg font-semibold text-blue-700 col-span-full">
            OT Seleccionada
          </h2>
          <Input label="Fecha" type="date" {...register("date")} />
          <Input label="Tipo de OT" {...register("type")} />
          <Input
            label="ID de OT"
            value={otData.custom_id || `Interno #${id}`}
            disabled
            readOnly
          />
          <Input label="Contrato" {...register("contract")} />
        </div>
        {/* --- SECCIÓN CLIENTE --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b pb-6">
          <h2 className="text-lg font-semibold text-blue-700 col-span-full">
            Información del Cliente
          </h2>
          <Input label="Empresa" value={otData.client_name} disabled readOnly />
          <Input
            label="Nº Cliente"
            value={otData.client_code}
            disabled
            readOnly
          />
          <Input
            label="Contacto"
            value={otData.client_contact || "N/A"}
            disabled
            readOnly
          />
        </div>
        {/* --- SECCIÓN PRODUCTO --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b pb-6">
          <h2 className="text-lg font-semibold text-blue-700 col-span-full">
            Producto
          </h2>
          <Input label="Nombre" {...register("product")} />
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

        {/* --- SECCIONES FINALES --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* --- SECCIÓN ACTIVIDADES --- */}
          <div>
            <h2 className="text-lg font-semibold text-blue-700 mb-4">
              Administracion
            </h2>
            <div className="space-y-4">
              <div>
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

          {/* --- SECCIÓN ADMINISTRACIÓN (SOLO ADMINS/DIRECTORES) --- */}
          {isDirectorOrAdmin() && (
            <div>
              <h2 className="text-lg font-semibold text-blue-700 mb-4">
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
                  {...register("quotation_amount")}
                />
                <Input label="Disposición" {...register("disposition")} />
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="text-sm font-medium text-gray-600">
                      Saldo a Facturar
                    </p>
                    <p className="text-lg font-bold text-gray-800">$0.00</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="text-sm font-medium text-gray-600">
                      Saldo a Cobrar
                    </p>
                    <p className="text-lg font-bold text-gray-800">$0.00</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-4">
                  <Button type="button" disabled>
                    Cargar Factura
                  </Button>
                  <Button type="button" disabled>
                    Cargar Recibo
                  </Button>
                </div>
                <div>
                  <h3 className="text-md font-semibold mt-4">Archivos</h3>
                  <p className="text-sm text-gray-500">(Próximamente)</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Estado Final
                  </label>
                  <select
                    {...register("status")}
                    className="w-full mt-1 p-2 border rounded-md"
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

export default OTDetail;
