// RUTA: consultar/src/pages/Facturacion.tsx

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useSWR from "swr";
import { facturacionService, Factura } from "../services/facturacionService";
import { formatCurrency, formatDateTime } from "../lib/utils";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { PlusCircle, Filter } from "lucide-react";
import FacturaFilters from "../components/FacturaFilters";
import { cn } from "../lib/utils";

const Facturacion: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Función para obtener los filtros iniciales de la URL
  const getFiltersFromURL = React.useCallback(() => {
    const params = new URLSearchParams(location.search);
    const initialFilters: any = {};
    if (params.get("estado")) {
      initialFilters.estado = params.get("estado");
    }
    // Aquí se podrían añadir más filtros desde la URL si es necesario
    return initialFilters;
  }, [location.search]);

  const [filters, setFilters] = useState<any>(getFiltersFromURL());
  const [showFilters, setShowFilters] = useState(
    Object.keys(getFiltersFromURL()).length > 0
  );

  // Efecto para actualizar los filtros si la URL cambia
  useEffect(() => {
    const newFilters = getFiltersFromURL();
    setFilters(newFilters);
    setShowFilters(Object.keys(newFilters).length > 0);
  }, [location.search, getFiltersFromURL]);

  const { data: facturas, error } = useSWR<Factura[]>(
    ["/facturacion", filters],
    () => facturacionService.getFacturas(filters)
  );

  const handleFilterChange = (name: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [name]: value || undefined }));
  };

  const handleResetFilters = () => {
    setFilters({});
    // Limpiamos la URL al resetear
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
                  };

                  return (
                    <tr
                      key={factura.id}
                      onClick={() => navigate(`/facturacion/${factura.id}`)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {factura.numero_factura}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {factura.cliente_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-300">
                        {formatCurrency(factura.monto)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatDateTime(factura.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatDateTime(factura.vencimiento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                            statusStyles[factura.estado] || "bg-gray-200"
                          }`}
                        >
                          {factura.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
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
    </div>
  );
};

export default Facturacion;
