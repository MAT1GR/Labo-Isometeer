// RUTA: /consultar/src/pages/Facturacion.tsx

import React from "react";
import useSWR from "swr";
import { useNavigate } from "react-router-dom";
import { facturacionService, Factura } from "../services/facturacionService";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Receipt, Edit, PlusCircle } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/utils";

const FacturacionPage: React.FC = () => {
  const {
    data: facturas,
    error,
    isLoading,
  } = useSWR<Factura[]>("/facturacion", facturacionService.getFacturas);
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
      case "pagada":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
      case "vencida":
        return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (error) return <div>Error al cargar las facturas.</div>;
  if (isLoading) return <div>Cargando facturas...</div>;

  // Asegurarse de que facturas sea un array antes de mapear
  const facturasArray = Array.isArray(facturas) ? facturas : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Facturación</h1>
        <Button onClick={() => navigate("/facturacion/crear")}>
          <PlusCircle className="mr-2 h-4 w-4" /> Crear Factura
        </Button>
      </div>
      <Card>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                N° Factura
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Monto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Pagado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                Vencimiento
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
            {facturasArray.map((factura) => (
              <tr key={factura.id}>
                <td className="px-6 py-4 font-medium">
                  {factura.numero_factura}
                </td>
                <td className="px-6 py-4">{factura.cliente_name || "N/A"}</td>
                <td className="px-6 py-4">{formatCurrency(factura.monto)}</td>
                <td className="px-6 py-4 font-semibold text-green-600">
                  {formatCurrency(factura.pagado)}
                </td>
                <td className="px-6 py-4">{formatDate(factura.vencimiento)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      factura.estado
                    )}`}
                  >
                    {factura.estado}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/facturacion/${factura.id}`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default FacturacionPage;
