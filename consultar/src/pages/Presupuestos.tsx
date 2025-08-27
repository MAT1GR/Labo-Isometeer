import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  presupuestoService,
  Presupuesto,
} from "../services/presupuestoService";
import Button  from "../components/ui/Button";
import Card  from "../components/ui/Card";
import { formatDate, formatCurrency } from "../lib/utils";
import { PlusCircle, AlertTriangle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const Presupuestos: React.FC = () => {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const canCreate =
    user?.role === "administracion" ||
    user?.role === "director" ||
    user?.role === "administrador";

  useEffect(() => {
    const fetchPresupuestos = async () => {
      try {
        const data = await presupuestoService.getAll();
        setPresupuestos(data);
      } catch (err) {
        setError("No se pudieron cargar los presupuestos.");
      } finally {
        setLoading(false);
      }
    };
    fetchPresupuestos();
  }, []);

  if (loading) return <div>Cargando presupuestos...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Presupuestos</h1>
        {canCreate && (
          <Button onClick={() => navigate("/presupuestos/crear")}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear Presupuesto
          </Button>
        )}
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
        <p>No hay presupuestos para mostrar.</p>
      )}
    </div>
  );
};

export default Presupuestos;
