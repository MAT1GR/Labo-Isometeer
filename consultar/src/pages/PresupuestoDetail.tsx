import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  presupuestoService,
  Presupuesto,
} from "../services/presupuestoService";
import { clientService } from "../services/clientService"; // Para obtener el nombre del cliente
import { exportPresupuestoPdf } from "../services/pdfGenerator";
import  Button  from "../components/ui/Button";
import  Card from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { formatDate, formatCurrency } from "../lib/utils";
import { AlertTriangle, CheckCircle, Download } from "lucide-react";

const PresupuestoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [clientName, setClientName] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      presupuestoService.getById(Number(id)).then(async (data) => {
        setPresupuesto(data);
        if (data.cliente_id) {
          const client = await clientService.getClientById(data.cliente_id);
          setClientName(client.name);
        }
      });
    }
  }, [id]);

  const handleAuthorize = async () => {
    if (id) {
      try {
        await presupuestoService.authorize(Number(id));
        setPresupuesto((prev) => (prev ? { ...prev, autorizado: true } : null));
        alert("Presupuesto autorizado con éxito.");
      } catch (error) {
        alert("No se pudo autorizar el presupuesto.");
      }
    }
  };

  const handleDownload = () => {
    if (presupuesto) {
      exportPresupuestoPdf(presupuesto, clientName);
    }
  };

  if (!presupuesto) return <div>Cargando...</div>;

  const canAuthorize =
    user?.role === "director" || user?.role === "administrador";

  return (
    <div>
      <Button
        variant="outline"
        onClick={() => navigate("/presupuestos")}
        className="mb-4"
      >
        Volver a la lista
      </Button>
      <Card>
        <div className="border-b pb-4 mb-4">
          <h2 className="text-lg font-semibold">
            Detalles del Presupuesto #{presupuesto.id}
          </h2>
          <p className="text-sm text-gray-500">Cliente: {clientName}</p>
        </div>
        <div className="space-y-2">
          <p>
            <strong>Producto:</strong> {presupuesto.producto}
          </p>
          <p>
            <strong>Tipo de Servicio:</strong> {presupuesto.tipo_servicio}
          </p>
          <p>
            <strong>Norma:</strong> {presupuesto.norma || "N/A"}
          </p>
          <p>
            <strong>Entrega:</strong> {presupuesto.entrega_dias} días
          </p>
          <p>
            <strong>Precio (Sin IVA):</strong>{" "}
            {formatCurrency(presupuesto.precio)}
          </p>
          <p>
            <strong>Creado:</strong> {formatDate(presupuesto.created_at)}
          </p>
          <div>
            <strong>Estado:</strong>
            {presupuesto.autorizado ? (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="mr-1 h-4 w-4" /> Autorizado
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <AlertTriangle className="mr-1 h-4 w-4" /> Pendiente de
                Autorización
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          {!presupuesto.autorizado && canAuthorize && (
            <Button onClick={handleAuthorize}>Autorizar</Button>
          )}
          {presupuesto.autorizado && (
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Descargar PDF
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PresupuestoDetail;
