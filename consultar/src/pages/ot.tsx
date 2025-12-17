import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { otService, WorkOrder } from "../services/otService";
import { clientService, Client } from "../services/clientService";
import { authService, User } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog";
import {
  PlusCircle,
  Briefcase,
  CheckSquare,
  XSquare,
  Filter,
  ChevronLeft,
  ChevronRight,
  Settings,
  LayoutList,
  Users as UsersIcon,
} from "lucide-react";
import useSWR, { mutate } from "swr";
import OTFiltersComponent from "../components/OTFilters";
import { AnimatePresence, motion } from "framer-motion";
import DashboardWorkload from "../components/DashboardWorkload";

export interface OTFilters {
  searchTerm?: string;
  clientName?: string;
  status?: string;
  assignedToId?: number;
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
  const [activeView, setActiveView] = useState<"list" | "workload">("list");
  const [filters, setFilters] = useState<OTFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: clients } = useSWR<Client[]>(
    "/clients",
    clientService.getAllClients
  );
  const { data: users } = useSWR<User[]>("/users", authService.getAllUsers);

  const swrKey = user ? [`/ot`, user.id, user.role, filters] : null;

  const {
    data: ots,
    error,
    isLoading,
  } = useSWR(swrKey, () => {
    if (canViewAdminContent()) {
      return otService.getAllOTs(user, filters);
    } else {
      return otService.getMisOts(user?.id || 0);
    }
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, ots]);

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

  const handleDelete = async (otId: number) => {
    try {
      await otService.deleteOT(otId);
      mutate(swrKey);
    } catch (err: any) {
      alert(err.message || "Error al eliminar la OT.");
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
      mutate(swrKey);
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
    <div className="flex flex-col h-full" ref={topOfListRef}>
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
              <Filter className="mr-2 h-4 w-4" /> Filtrar
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
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

      <div className="flex items-center gap-2 mb-6">
        <Button
          variant={activeView === "list" ? "secondary" : "ghost"}
          onClick={() => setActiveView("list")}
        >
          <LayoutList className="h-4 w-4 mr-2" />
          Listado de OTs
        </Button>
        <Button
          variant={activeView === "workload" ? "secondary" : "ghost"}
          onClick={() => setActiveView("workload")}
        >
          <UsersIcon className="h-4 w-4 mr-2" />
          Carga de Usuarios
        </Button>
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

      {activeView === 'list' && (
      <div className="flex-grow bg-card text-card-foreground shadow-xl border border-border rounded-lg overflow-hidden h-full">
        <div className="overflow-y-auto h-full">
          {isLoading ? (
            <div className="text-center py-12">Cargando...</div>
          ) : paginatedOts && paginatedOts.length > 0 ? (
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  {canAuthorizeOT() && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                      Auth
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    ID de OT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Asignado a
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    <Settings size={16} className="mx-auto" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                <AnimatePresence>
                  {paginatedOts.map((ot: WorkOrder) => (
                    <motion.tr
                      key={ot.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      onClick={() => navigate(`/ot/editar/${ot.id}`)}
                      className={`cursor-pointer hover:bg-muted/50 ${
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
                        <Badge
                          variant="outline"
                          className={getStatusColor(ot.status)}
                        >
                          {ot.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canAuthorizeOT() && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleAuthorization(ot)
                                }}
                              >
                                {ot.authorized ? "Desautorizar" : "Autorizar"}
                              </DropdownMenuItem>
                            )}
                             <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive"
                                   disabled={!canViewAdminContent()}
                                >
                                  Eliminar
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción eliminará la OT permanentemente. No podrás deshacerla.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleDelete(ot.id);
                                    }}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
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
        </div>
      </div>
      )}
      {activeView === 'workload' && ots && <DashboardWorkload ot={ots} />}

      {totalPages > 1 && activeView === 'list' && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
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
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default OT;
