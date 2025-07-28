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
  const { user, canCreateContent, canViewAdminContent, canAuthorizeOT } =
    useAuth();
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
    if (!user) return; // Asegurarse de que el usuario exista

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
        // CORREGIDO: Se pasa el ID del usuario al autorizar
        await otService.authorizeOT(ot.id, user.id);
      }
      mutate(["/ots", user]);
    } catch (error: any) {
      alert(error.message || "Error al cambiar el estado de autorización.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
      case "en_progreso":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
      case "finalizada":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
      case "facturada":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300";
      case "cierre":
        return "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (error) return <div>Error al cargar las órdenes de trabajo.</div>;
  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {canViewAdminContent()
            ? "Órdenes de Trabajo"
            : "Mis Tareas Asignadas"}
        </h1>
        {canCreateContent() && (
          <Button onClick={() => navigate("/ot/crear")}>
            <PlusCircle className="mr-2 h-4 w-4" /> Crear Nueva OT
          </Button>
        )}
      </div>
      <Card>
        {ots && ots.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {canAuthorizeOT() && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Auth
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  ID de OT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Asignado a
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {ots.map((ot) => (
                <tr
                  key={ot.id}
                  className={`${
                    !ot.authorized && canViewAdminContent()
                      ? "bg-orange-50 dark:bg-orange-900/20"
                      : ""
                  }`}
                >
                  {canAuthorizeOT() && (
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleAuthorization(ot)}
                        title={ot.authorized ? "Desautorizar" : "Autorizar"}
                      >
                        {ot.authorized ? (
                          <span title="Autorizada">
                            <CheckSquare className="h-5 w-5 text-green-500" />
                          </span>
                        ) : (
                          <span title="Pendiente de autorización">
                            <XSquare className="h-5 w-5 text-red-500" />
                          </span>
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
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        ot.status
                      )}`}
                    >
                      {ot.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/ot/editar/${ot.id}`)}
                    >
                      {canViewAdminContent() ? (
                        <Edit className="h-4 w-4" />
                      ) : (
                        "Ver"
                      )}
                    </Button>
                    {canViewAdminContent() && (
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
        ) : (
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold">
              {canViewAdminContent()
                ? "No hay Órdenes de Trabajo"
                : "Sin tareas asignadas"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {canViewAdminContent()
                ? "¡Crea la primera para empezar a trabajar!"
                : "No tienes Órdenes de Trabajo autorizadas en este momento."}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OT;
