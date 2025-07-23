// RUTA: /cliente/src/pages/OTDetail.tsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { otService, WorkOrder } from "../services/otService";
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
  Edit,
} from "lucide-react";
import { mutate } from "swr";

const OTDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isDirectorOrAdmin } = useAuth();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<WorkOrder>();
  const [otData, setOtData] = useState<WorkOrder | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const otType = useWatch({ control, name: "type" });
  const isLacreEnabled =
    otType === "Ensayo SE" ||
    otType === "Ensayo EE" ||
    otType === "Otros Servicios";

  const loadData = async () => {
    if (id) {
      try {
        const [ot, userList] = await Promise.all([
          otService.getOTById(Number(id)),
          isDirectorOrAdmin() ? authService.getAllUsers() : Promise.resolve([]),
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

  useEffect(() => {
    loadData();
  }, [id, reset]);

  const onSubmit = async (data: WorkOrder) => {
    try {
      const dataToSubmit = { ...data, role: user?.role }; // Incluimos el rol para la lógica del backend
      await otService.updateOT(Number(id), dataToSubmit);
      mutate(["/ots", user]); // Refresca la lista principal
      navigate("/ot");
    } catch (error: any) {
      alert(error.message || "Hubo un error al guardar los cambios.");
    }
  };

  const handleAuthorize = async () => {
    if (!id) return;
    await otService.authorizeOT(Number(id));
    await loadData();
    mutate(["/ots", user]);
  };
  const handleStartWork = async () => {
    if (!id) return;
    await otService.startOT(Number(id));
    await loadData();
  };
  const handleStopWork = async () => {
    if (!id) return;
    await otService.stopOT(Number(id));
    await loadData();
  };

  if (!otData) return <div className="p-8">Cargando datos...</div>;

  const isEmployee = user?.role === "empleado";
  const isWorkInProgressOrDone = otData.status !== "pendiente";
  const isClosed = otData.status === "cierre";

  // El empleado puede editar solo sus observaciones y solo si la OT no está cerrada.
  const canEmployeeEdit = !isClosed;
  // El admin puede editar la sección de admin siempre, pero los datos principales solo si está pendiente.
  const canAdminEditMainData = !isWorkInProgressOrDone;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 bg-gray-50 p-6 rounded-lg"
    >
      <div className="flex justify-between items-center">
        <Button type="button" variant="ghost" onClick={() => navigate("/ot")}>
          <ArrowLeft className="mr-2 h-5 w-5" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">
          Detalle de OT: {otData.custom_id || `#${otData.id}`}
        </h1>
        {/* El botón de guardar es visible para todos, pero la lógica de envío se encarga de los permisos */}
        <Button
          type="submit"
          disabled={
            isSubmitting || !isDirty || (isEmployee && !canEmployeeEdit)
          }
        >
          <Save className="mr-2 h-5 w-5" />
          Guardar Cambios
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm flex flex-wrap justify-center items-center gap-4">
        {isDirectorOrAdmin() && !otData.authorized && (
          <Button
            type="button"
            onClick={handleAuthorize}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckSquare className="mr-2 h-5 w-5" /> Autorizar OT
          </Button>
        )}
        {isEmployee && otData.authorized && !otData.started_at && (
          <Button
            type="button"
            onClick={handleStartWork}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="mr-2 h-5 w-5" /> Empezar Trabajo
          </Button>
        )}
        {isEmployee && otData.started_at && !otData.completed_at && (
          <Button
            type="button"
            onClick={handleStopWork}
            className="bg-red-600 hover:bg-red-700"
          >
            <StopCircle className="mr-2 h-5 w-5" /> Finalizar Trabajo
          </Button>
        )}
        {otData.completed_at && (
          <div className="text-center p-2 rounded-md bg-green-50 text-green-800">
            <p className="font-semibold">Trabajo Finalizado</p>
            <p className="text-sm">
              Duración: {otData.duration_minutes} minutos
            </p>
          </div>
        )}
      </div>

      {isDirectorOrAdmin() && !canAdminEditMainData && (
        <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-center font-semibold">
          Los datos principales de esta OT no se pueden editar porque ya está en
          progreso o finalizada. Solo se puede modificar la sección de
          Administración.
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm space-y-8">
        <fieldset
          disabled={
            isEmployee || (isDirectorOrAdmin() && !canAdminEditMainData)
          }
          className="disabled:opacity-70"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-b pb-6">
            <h2 className="text-lg font-semibold text-blue-700 col-span-full">
              OT Seleccionada
            </h2>
            <Input label="Fecha" type="date" {...register("date")} />
            <div>
              <label className="text-sm font-medium">Tipo de OT</label>
              <select
                {...register("type")}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="Produccion">Producción</option>
                <option value="Calibracion">Calibración</option>
                <option value="Ensayo SE">Ensayo SE</option>
                <option value="Ensayo EE">Ensayo EE</option>
                <option value="Otros Servicios">Otros Servicios</option>
              </select>
            </div>
            <Input
              label="ID de OT"
              value={otData.custom_id || `Interno #${id}`}
              readOnly
            />
            {!isEmployee && (
              <Input label="Contrato" {...register("contract")} />
            )}
          </div>
        </fieldset>

        {!isEmployee && (
          <fieldset
            disabled={isDirectorOrAdmin() && !canAdminEditMainData}
            className="disabled:opacity-70"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b pb-6">
              <h2 className="text-lg font-semibold text-blue-700 col-span-full">
                Información del Cliente
              </h2>
              <Input label="Empresa" value={otData.client_name} readOnly />
              <Input label="Nº Cliente" value={otData.client_code} readOnly />
            </div>
          </fieldset>
        )}

        <fieldset
          disabled={
            isEmployee || (isDirectorOrAdmin() && !canAdminEditMainData)
          }
          className="disabled:opacity-70"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b pb-6">
            <h2 className="text-lg font-semibold text-blue-700 col-span-full">
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
              <label className="text-sm font-medium">
                Observaciones (Generales)
              </label>
              <textarea
                {...register("observations")}
                className="w-full mt-1 p-2 border rounded-md"
                rows={3}
              ></textarea>
            </div>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {isEmployee && (
            <div className="col-span-full">
              <h2 className="text-lg font-semibold text-blue-700 mb-4">
                Mis Observaciones
              </h2>
              <textarea
                {...register("collaborator_observations")}
                disabled={!canEmployeeEdit}
                className="w-full mt-1 p-2 border rounded-md"
                rows={4}
              ></textarea>
            </div>
          )}

          {isDirectorOrAdmin() && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-blue-700 mb-4">
                  Actividades
                </h2>
                <fieldset disabled={isClosed}>
                  <div>
                    <label className="text-sm font-medium">Asignar a</label>
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
                </fieldset>
                <div className="mt-4">
                  <label className="text-sm font-medium">
                    Observaciones del Colaborador
                  </label>
                  <textarea
                    value={otData.collaborator_observations || ""}
                    readOnly
                    className="w-full mt-1 p-2 border rounded-md bg-gray-100"
                    rows={3}
                  ></textarea>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-blue-700 mb-4">
                  Administración
                </h2>
                <fieldset disabled={isClosed} className="space-y-4">
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
                      <p className="text-sm font-medium">Saldo a Facturar</p>
                      <p className="text-lg font-bold">$0.00</p>
                    </div>
                    <div className="bg-gray-100 p-3 rounded">
                      <p className="text-sm font-medium">Saldo a Cobrar</p>
                      <p className="text-lg font-bold">$0.00</p>
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
                    <label className="text-sm font-medium">Estado Final</label>
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
                </fieldset>
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  );
};

export default OTDetail;
