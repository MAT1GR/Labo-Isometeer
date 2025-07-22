// RUTA: /cliente/src/pages/OT.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import { otService, WorkOrder } from "../services/otService";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  PlusCircle,
  Briefcase,
  Trash2,
  Edit,
  CheckSquare,
  XSquare,
} from "lucide-react";
import useSWR, { mutate } from "swr";

const OT: React.FC = () => {
  const { user, isDirectorOrAdmin } = useAuth();
  const navigate = useNavigate();

  const {
    data: ots,
    error,
    isLoading,
  } = useSWR(user ? ["/ots", user] : null, () => otService.getAllOTs(user));

  const handleDelete = async (otId: number) => {
    if (
      window.confirm(
        "¿Estás seguro de que quieres eliminar esta Orden de Trabajo?"
      )
    ) {
      try {
        await otService.deleteOT(otId);
        mutate(["/ots", user]);
      } catch (err: any) {
        alert(err.message || "Error al eliminar la OT.");
      }
    }
  };

  const handleToggleAuthorization = async (ot: WorkOrder) => {
    try {
      if (ot.authorized) {
        if (ot.status !== "pendiente") {
          alert(
            "No se puede desautorizar una OT que ya está en progreso o finalizada."
          );
          return;
        }
        await otService.deauthorizeOT(ot.id);
      } else {
        await otService.authorizeOT(ot.id);
      }
      mutate(["/ots", user]);
    } catch (error: any) {
      alert(error.message || "Error al cambiar el estado de autorización.");
    }
  };

  if (error) return <div>Error al cargar las órdenes de trabajo.</div>;
  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {isDirectorOrAdmin() ? "Órdenes de Trabajo" : "Mis Tareas Asignadas"}
        </h1>
        {isDirectorOrAdmin() && (
          <Button onClick={() => navigate("/ot/crear")}>
            <PlusCircle className="mr-2 h-4 w-4" /> Crear Nueva OT
          </Button>
        )}
      </div>
      <Card>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {isDirectorOrAdmin() && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Auth
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ID de OT
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Producto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Asignado a
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ots?.map((ot) => (
              <tr
                key={ot.id}
                className={`${
                  !ot.authorized && isDirectorOrAdmin() ? "bg-orange-50" : ""
                }`}
              >
                {isDirectorOrAdmin() && (
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleAuthorization(ot)}
                      title={ot.authorized ? "Desautorizar" : "Autorizar"}
                    >
                      {ot.authorized ? (
                        <CheckSquare className="h-5 w-5 text-green-500" />
                      ) : (
                        <XSquare className="h-5 w-5 text-red-500" />
                      )}
                    </button>
                  </td>
                )}
                <td className="px-6 py-4 font-medium">
                  {ot.custom_id || `Interno #${ot.id}`}
                </td>
                <td className="px-6 py-4">{ot.client_name}</td>
                <td className="px-6 py-4">{ot.product}</td>
                <td className="px-6 py-4">
                  {ot.assigned_to_name || "Sin asignar"}
                </td>
                <td className="px-6 py-4 capitalize">
                  {ot.status.replace("_", " ")}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/ot/editar/${ot.id}`)}
                  >
                    {isDirectorOrAdmin() ? <Edit className="h-4 w-4" /> : "Ver"}
                  </Button>
                  {isDirectorOrAdmin() && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(ot.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default OT;
