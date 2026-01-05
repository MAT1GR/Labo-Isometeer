// consultar/src/pages/Facturacion.tsx

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useSWR from "swr";
import { facturacionService, Factura } from "../services/facturacionService";
import { formatCurrency, formatDateTime } from "../lib/utils";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  PlusCircle,
  Filter,
  Archive,
  Info,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import FacturaFilters from "../components/FacturaFilters";
import { cn } from "../lib/utils";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import Modal from "../components/ui/Modal";

const Facturacion: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getFiltersFromURL = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const initialFilters: any = {};
    if (params.get("estado")) initialFilters.estado = params.get("estado");
    if (params.get("cliente_id"))
      initialFilters.cliente_id = params.get("cliente_id");
    if (params.get("fecha_desde"))
      initialFilters.fecha_desde = params.get("fecha_desde");
    if (params.get("fecha_hasta"))
      initialFilters.fecha_hasta = params.get("fecha_hasta");
    return initialFilters;
  }, [location.search]);

  const [filters, setFilters] = useState<any>(getFiltersFromURL());
  const [showFilters, setShowFilters] = useState(
    Object.keys(getFiltersFromURL()).length > 0
  );

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [facturaToArchive, setFacturaToArchive] = useState<Factura | null>(
    null
  );
  const [archiveReason, setArchiveReason] = useState("");
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [currentReason, setCurrentReason] = useState("");

  // --- NUEVOS ESTADOS PARA MODAL DE ELIMINACIÓN ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [facturaToDelete, setFacturaToDelete] = useState<Factura | null>(null);

  useEffect(() => {
    const newFilters = getFiltersFromURL();
    setFilters(newFilters);
    setShowFilters(Object.keys(newFilters).length > 0);
  }, [location.search, getFiltersFromURL]);

  const {
    data: facturas,
    error,
    mutate,
  } = useSWR<Factura[]>(["/facturacion", filters], () =>
    facturacionService.getFacturas(filters)
  );

  const handleArchiveFactura = async () => {
    if (facturaToArchive && archiveReason) {
      try {
        await facturacionService.archiveFactura(
          facturaToArchive.id,
          archiveReason
        );
        mutate();
        setShowArchiveModal(false);
        setArchiveReason("");
      } catch (e) {
        console.error("Error al archivar la factura", e);
      }
    }
  };

  const handleOpenArchiveModal = (factura: Factura) => {
    setFacturaToArchive(factura);
    setShowArchiveModal(true);
  };

  const handleViewReason = (reason: string) => {
    setCurrentReason(reason);
    setShowReasonModal(true);
  };

  const handleFilterChange = (name: string, value: any) => {
    const newFilters = { ...filters, [name]: value };

    Object.keys(newFilters).forEach((key) => {
      if (
        newFilters[key] === undefined ||
        newFilters[key] === null ||
        newFilters[key] === ""
      ) {
        delete newFilters[key];
      }
    });

    setFilters(newFilters);

    const params = new URLSearchParams(newFilters);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const handleResetFilters = () => {
    setFilters({});
    navigate(location.pathname, { replace: true });
  };

  // --- NUEVAS FUNCIONES HANDLER PARA DESARCHIVAR Y ELIMINAR ---

  const handleUnarchive = async (facturaId: number) => {
    try {
      await facturacionService.unarchiveFactura(facturaId);
      mutate(); // Recarga los datos
    } catch (error) {
      console.error("Error al desarchivar factura:", error);
      alert("No se pudo desarchivar la factura.");
    }
  };

  const handleDeleteRequest = (factura: Factura) => {
    setFacturaToDelete(factura);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!facturaToDelete) return;
    try {
      await facturacionService.deleteFactura(facturaToDelete.id);
      mutate(); // Recarga los datos
    } catch (error) {
      console.error("Error al eliminar la factura:", error);
      alert("No se pudo eliminar la factura.");
    } finally {
      setIsDeleteModalOpen(false);
      setFacturaToDelete(null);
    }
  };

  if (error) return <div>Error al cargar facturas...</div>;
  if (!facturas) return <div>Cargando facturas...</div>;

  return (
    <div className="container mx-auto p-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Facturación</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtrar
          </Button>
          <Button onClick={() => navigate("/facturacion/crear")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Factura
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          showFilters
            ? "max-h-96 opacity-100 mb-6 visible"
            : "max-h-0 opacity-0 invisible"
        )}
      >
        <FacturaFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />
      </div>

      <div className="bg-card text-card-foreground shadow-xl border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Factura #
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Cliente
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Tipo
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Monto Total
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Fecha Creación
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Vencimiento
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Estado
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {facturas.length > 0 ? (
                facturas.map((factura) => {
                  const statusStyles: { [key: string]: string } = {
                    pagada:
                      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
                    vencida:
                      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                    pendiente:
                      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                    archivada:
                      "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200",
                  };
                  return (
                    <tr
                      key={factura.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onDoubleClick={() => navigate(`/facturacion/${factura.id}`)}
                    >
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                      >
                        {factura.numero_factura}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm"
                      >
                        {factura.cliente_name}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm"
                      >
                        {factura.tipo}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm font-mono"
                      >
                        {formatCurrency(factura.monto, factura.moneda)}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm"
                      >
                        {formatDateTime(factura.created_at)}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm"
                      >
                        {formatDateTime(factura.vencimiento)}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-center text-sm"
                      >
                        <span
                          className={`px-2.5 py-0.5 text-sm font-semibold rounded-full uppercase ${
                            statusStyles[factura.estado] || "bg-gray-200"
                          }`}
                        >
                          {factura.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        {factura.estado !== "archivada" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Archivar"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenArchiveModal(factura);
                            }}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        {factura.estado === "archivada" && (
                          <div className="flex items-center justify-center gap-1">
                            {factura.motivo_archivo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver motivo del archivo"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewReason(
                                    factura.motivo_archivo || ""
                                  );
                                }}
                              >
                                <Info className="h-4 w-4 text-blue-400" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Desarchivar"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnarchive(factura.id);
                              }}
                            >
                              <ArchiveRestore className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Eliminar Permanentemente"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRequest(factura);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 text-center text-sm text-muted-foreground"
                  >
                    No se encontraron facturas con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showArchiveModal}
        title="Confirmar Archivo de Factura"
        message="Por favor, describe la razón por la que deseas archivar esta factura."
        onConfirm={handleArchiveFactura}
        onClose={() => setShowArchiveModal(false)}
        confirmText="Archivar"
      >
        <textarea
          className="mt-4 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          rows={4}
          value={archiveReason}
          onChange={(e) => setArchiveReason(e.target.value)}
          placeholder="Motivo del archivo..."
        />
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Eliminar Factura Permanentemente"
        message={`¿Estás seguro de que quieres eliminar la factura #${facturaToDelete?.numero_factura}? Esta acción no se puede deshacer.`}
        onConfirm={handleConfirmDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        confirmText="Sí, Eliminar"
      />

      <Modal
        isOpen={showReasonModal}
        onClose={() => setShowReasonModal(false)}
        title="Motivo de Archivo"
      >
        <p className="text-gray-600 dark:text-gray-300 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          {currentReason}
        </p>
      </Modal>
    </div>
  );
};

export default Facturacion;
