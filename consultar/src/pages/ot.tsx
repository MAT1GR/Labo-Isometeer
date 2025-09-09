// RUTA: consultar/src/pages/ot.tsx

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { otService, WorkOrder } from "../services/otService";
import { clientService, Client } from "../services/clientService";
import { authService, User } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  PlusCircle,
  Briefcase,
  Trash2,
  CheckSquare,
  XSquare,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import useSWR, { mutate } from "swr";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import OTFiltersComponent from "../components/OTFilters";
import { AnimatePresence, motion } from "framer-motion";

export interface OTFilters {
  client_id?: number;
  status?: string;
  assigned_to?: number;
  authorized?: boolean;
  start_date?: string;
  end_date?: string;
}

const OTS_PER_PAGE = 50;

const OT: React.FC = () => {
  const { user, canCreateContent, canViewAdminContent, canAuthorizeOT } =
    useAuth();
  const navigate = useNavigate();
  const topOfListRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [otToDelete, setOtToDelete] = useState<number | null>(null);

  const [filters, setFilters] = useState<OTFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: clients } = useSWR<Client[]>(
    "/clients",
    clientService.getAllClients
  );
  const { data: users } = useSWR<User[]>("/users", authService.getAllUsers);

  // --- MODIFICACIÓN CLAVE: Lógica condicional para obtener las OTs ---
  const {
    data: ots,
    error,
    isLoading,
  } = useSWR(
    user ? [`/ot`, user, filters] : null,
    ([, user, currentFilters]) => {
      if (canViewAdminContent()) {
        // Los administradores ven todo, aplicando filtros
        return otService.getAllOTs(user, currentFilters);
      } else {
        // Los empleados solo ven sus OTs, no se aplican filtros desde la UI
        return otService.getMisOts();
      }
    }
  );
  // --- FIN DE LA MODIFICACIÓN ---

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, ots]); // Resetear en cambio de ots también

  useEffect(() => {
    if (topOfListRef.current) {
      topOfListRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentPage]);

  const totalPages = ots ? Math.ceil(ots.length / OTS_PER_PAGE) : 0;
  const paginatedOts = useMemo(() => {
    if (!ots) return [];
    const startIndex = (currentPage - 1) * OTS_PER_PAGE;
    return ots.slice(startIndex, startIndex + OTS_PER_PAGE);
  }, [ots, currentPage]);

  const handleDeleteRequest = (otId: number) => {
    setOtToDelete(otId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setOtToDelete(null);
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (otToDelete === null) return;
    try {
      await otService.deleteOT(otToDelete);
      mutate([`/ot`, user, filters]); // Revalidar los datos
    } catch (err: any) {
      alert(err.message || "Error al eliminar la OT.");
    } finally {
      handleCloseModal();
    }
  };

  const handleToggleAuthorization = async (ot: WorkOrder) => {
    if (!user) return;
    try {
      if (ot.authorized) {
        if (ot.status !== "pendiente") {
          alert(
            "No se puede desautorizar una OT que ya está en progreso o finalizada."
          );
          return;
        }
        await otService.deauthorizeOT(ot.id, user.id);
      } else {
        await otService.authorizeOT(ot.id, user.id);
      }
      mutate([`/ot`, user, filters]); // Revalidar los datos
    } catch (error: any) {
      alert(error.message || "Error al cambiar el estado de autorización.");
    }
  };

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter(
        (v) => v !== undefined && v !== null && v !== ""
      ).length,
    [filters]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
      case "en_progreso":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
      case "finalizada":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
      case "facturada":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300";
      case "cerrada":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (error) return <div>Error al cargar las órdenes de trabajo.</div>;

  return (
    <>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="Eliminar Orden de Trabajo"
        message="¿Estás seguro de que quieres eliminar esta OT? Esta acción no se puede deshacer."
      />
      <div ref={topOfListRef}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            {canViewAdminContent()
              ? "Órdenes de Trabajo"
              : "Mis Tareas Asignadas"}
          </h1>
          <div className="flex items-center gap-2">
            {canViewAdminContent() && (
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
                {activeFilterCount > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            )}
            {canCreateContent() && (
              <Button onClick={() => navigate("/ot/crear")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Crear Nueva OT
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showFilters && canViewAdminContent() && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <OTFiltersComponent
                filters={filters}
                setFilters={setFilters}
                clients={clients || []}
                users={users || []}
                onClose={() => setShowFilters(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <Card>
          {isLoading ? (
            <div className="text-center py-12">Cargando...</div>
          ) : paginatedOts && paginatedOts.length > 0 ? (
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
                {paginatedOts.map((ot) => (
                  <tr
                    key={ot.id}
                    onClick={() => navigate(`/ot/editar/${ot.id}`)}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 ${
                      !ot.authorized && canViewAdminContent()
                        ? "bg-orange-50 dark:bg-orange-900/20"
                        : ""
                    }`}
                  >
                    {canAuthorizeOT() && (
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAuthorization(ot);
                          }}
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
                    <td className="px-6 py-4">
                      {ot.assigned_to_name || "Sin asignar"}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 inline-flex text-sm leading-5 font-semibold rounded-full uppercase ${getStatusColor(
                          ot.status
                        )}`}
                      >
                        {ot.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {canViewAdminContent() && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRequest(ot.id);
                          }}
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
                {activeFilterCount > 0
                  ? "No se encontraron OTs con los filtros aplicados"
                  : canViewAdminContent()
                  ? "No hay Órdenes de Trabajo"
                  : "Sin tareas asignadas"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeFilterCount > 0
                  ? "Intenta ajustar o limpiar los filtros."
                  : canViewAdminContent()
                  ? "¡Crea la primera para empezar a trabajar!"
                  : "No tienes Órdenes de Trabajo autorizadas en este momento."}
              </p>
            </div>
          )}
        </Card>
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default OT;
