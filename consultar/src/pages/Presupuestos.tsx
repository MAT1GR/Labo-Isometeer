// RUTA: consultar/src/pages/Presupuestos.tsx

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useSWR from "swr";
import {
  presupuestoService,
  Presupuesto,
} from "../services/presupuestoService";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { formatDate, formatCurrency } from "../lib/utils";
import { PlusCircle, AlertTriangle, Filter } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import PresupuestoFilters from "../components/PresupuestoFilters";
import { cn } from "../lib/utils";

const Presupuestos: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState<any>({});
  const [showFilters, setShowFilters] = useState(false);

  const canCreate =
    user?.role === "administracion" ||
    user?.role === "director" ||
    user?.role === "administrador";

  const { data: presupuestos, error } = useSWR<Presupuesto[]>(
    ["/presupuestos", filters],
    () => presupuestoService.getAll(filters)
  );

  const handleFilterChange = (name: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [name]: value || undefined }));
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  if (error)
    return (
      <div className="text-red-500">
        No se pudieron cargar los presupuestos.
      </div>
    );
  if (!presupuestos) return <div>Cargando presupuestos...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Presupuestos</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtrar
          </Button>
          {canCreate && (
            <Button onClick={() => navigate("/presupuestos/crear")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Presupuesto
            </Button>
          )}
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
        <PresupuestoFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />
      </div>

      {presupuestos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presupuestos.map((p) => (
            <Link to={`/presupuestos/${p.id}`} key={p.id} className="block">
              <Card className="hover:shadow-lg transition-shadow p-4 flex flex-col justify-between h-full">
                <div className="mb-2">
                  <h2 className="text-lg font-semibold">Presupuesto #{p.id}</h2>
                  <p className="text-gray-600">{p.client_name}</p>
                </div>
                <div className="mb-2">
                  <p>
                    <strong>Producto:</strong> {p.producto}
                  </p>
                  <p>
                    <strong>Precio:</strong> {formatCurrency(p.precio)}
                  </p>
                  <p>
                    <strong>Fecha:</strong> {formatDate(p.created_at)}
                  </p>
                </div>
                <div>
                  {p.autorizado ? (
                    <span className="text-sm font-medium text-green-600">
                      Autorizado
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-yellow-600 flex items-center">
                      <AlertTriangle className="mr-1 h-4 w-4" />
                      Pendiente de Autorización
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="text-center p-4">
          No se encontraron presupuestos con los filtros seleccionados.
        </Card>
      )}
    </div>
  );
};

export default Presupuestos;
