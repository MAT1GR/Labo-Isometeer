// consultar/src/pages/Facturacion.tsx

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useSWR from "swr";
import { facturacionService, Factura } from "../services/facturacionService";
import { formatCurrency, formatDateTime } from "../lib/utils";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { PlusCircle, Filter, Archive, Info } from "lucide-react";
import FacturaFilters from "../components/FacturaFilters";
import { cn } from "../lib/utils";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import Modal from "../components/ui/Modal"; // <--- Asegúrate de que esta importación sea correcta

const Facturacion: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getFiltersFromURL = React.useCallback(() => {
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

  if (error) return <div>Error al cargar facturas...</div>;
  if (!facturas) return <div>Cargando facturas...</div>;

  return (
    <div className="container mx-auto p-4">
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

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Factura #
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Cliente
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Tipo
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Monto Total
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Fecha Creación
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Vencimiento
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Estado
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
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
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    >
                      <td
                        onClick={() => navigate(`/facturacion/${factura.id}`)}
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white"
                      >
                        {factura.numero_factura}
                      </td>
                      <td
                        onClick={() => navigate(`/facturacion/${factura.id}`)}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300"
                      >
                        {factura.cliente_name}
                      </td>
                      <td
                        onClick={() => navigate(`/facturacion/${factura.id}`)}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300"
                      >
                        {factura.tipo}
                      </td>
                      <td
                        onClick={() => navigate(`/facturacion/${factura.id}`)}
                        className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-300"
                      >
                        {formatCurrency(factura.monto)}
                      </td>
                      <td
                        onClick={() => navigate(`/facturacion/${factura.id}`)}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300"
                      >
                        {formatDateTime(factura.created_at)}
                      </td>
                      <td
                        onClick={() => navigate(`/facturacion/${factura.id}`)}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300"
                      >
                        {formatDateTime(factura.vencimiento)}
                      </td>
                      <td
                        onClick={() => navigate(`/facturacion/${factura.id}`)}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenArchiveModal(factura);
                            }}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        {factura.estado === "archivada" &&
                          factura.motivo_archivo && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewReason(factura.motivo_archivo || "");
                              }}
                            >
                              <Info className="h-4 w-4 text-gray-400" />
                            </Button>
                          )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No se encontraron facturas con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {/* Modal de confirmación para archivar */}
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

      {/* Modal para ver el motivo del archivo (ahora usa el componente Modal mejorado) */}
      <Modal
        isOpen={showReasonModal}
        onClose={() => setShowReasonModal(false)}
        title="Motivo de Archivo"
        // Puedes agregar un className si quieres un ancho específico, por ejemplo:
        // className="max-w-xl"
      >
        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
          {currentReason}
        </p>
      </Modal>
    </div>
  );
};

export default Facturacion;
