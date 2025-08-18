// RUTA: /consultar/src/pages/FacturaDetail.tsx

import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import useSWR, { mutate } from "swr";
import { useForm } from "react-hook-form";
import {
  facturacionService,
  Factura,
  Cobro,
} from "../services/facturacionService";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { formatCurrency, formatDate } from "../lib/utils";
import { ArrowLeft, PlusCircle, FileText } from "lucide-react";

type CobroFormData = Omit<Cobro, "id" | "factura_id" | "created_at">;

const FacturaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: factura,
    error,
    isLoading,
    mutate: mutateFactura,
  } = useSWR<Factura>(id ? `/facturacion/${id}` : null, () =>
    facturacionService.getFacturaById(Number(id))
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<CobroFormData>({
    defaultValues: { fecha: new Date().toISOString().split("T")[0] },
  });

  const saldo = factura ? factura.monto - (factura.pagado || 0) : 0;

  const onAddCobro = async (data: CobroFormData) => {
    if (!id) return;
    try {
      await facturacionService.createCobro(Number(id), data);
      mutateFactura();
      mutate(`/facturacion`);
      reset({
        fecha: new Date().toISOString().split("T")[0],
        monto: 0,
        medio_de_pago: "",
      });
    } catch (error) {
      console.error("Error al registrar el cobro:", error);
      alert("Error al registrar el cobro.");
    }
  };

  if (error) return <div>Error al cargar la factura.</div>;
  if (isLoading) return <div>Cargando...</div>;
  if (!factura) return <div>Factura no encontrada.</div>;

  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case "pagada":
        return "text-green-600";
      case "vencida":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate("/facturacion")}
        >
          <ArrowLeft className="mr-2 h-5 w-5" /> Volver
        </Button>
        <h1 className="text-3xl font-bold">
          Detalle de Factura: {factura.numero_factura}
        </h1>
        <div></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Información General</h2>
            <div className="space-y-3">
              <p>
                <strong>Cliente:</strong> {factura.cliente_name || "N/A"}
              </p>
              <p>
                <strong>Monto Total:</strong> {formatCurrency(factura.monto)}
              </p>
              <p>
                <strong>Total Pagado:</strong>{" "}
                <span className="text-green-600 font-bold">
                  {formatCurrency(factura.pagado || 0)}
                </span>
              </p>
              <p>
                <strong>Saldo Pendiente:</strong>{" "}
                <span className="text-red-600 font-bold">
                  {formatCurrency(saldo)}
                </span>
              </p>
              <p>
                <strong>Vencimiento:</strong> {formatDate(factura.vencimiento)}
              </p>
              <p>
                <strong>Estado:</strong>{" "}
                <span
                  className={`font-semibold capitalize ${getStatusColorClasses(
                    factura.estado
                  )}`}
                >
                  {factura.estado}
                </span>
              </p>
            </div>
          </Card>

          {/* === PANEL DE AÑADIR COBRO (MOVIDO AQUÍ) === */}
          {factura.estado !== "pagada" && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Añadir Cobro</h2>
              <form onSubmit={handleSubmit(onAddCobro)} className="space-y-4">
                <Input
                  label="Monto (ARS)"
                  type="number"
                  step="0.01"
                  {...register("monto", {
                    valueAsNumber: true,
                    required: "El monto es requerido",
                    max: {
                      value: saldo,
                      message: "El monto no puede superar el saldo pendiente",
                    },
                    min: {
                      value: 0.01,
                      message: "El monto debe ser positivo",
                    },
                  })}
                  error={errors.monto?.message}
                />
                <Input
                  label="Medio de Pago"
                  {...register("medio_de_pago", {
                    required: "Este campo es requerido",
                  })}
                  placeholder="Ej: Transferencia, Efectivo..."
                  error={errors.medio_de_pago?.message}
                />
                <Input
                  label="Fecha"
                  type="date"
                  {...register("fecha", { required: "La fecha es requerida" })}
                  error={errors.fecha?.message}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Registrando..." : "Registrar Cobro"}
                </Button>
              </form>
            </Card>
          )}

          {factura.ots && factura.ots.length > 0 && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">
                Órdenes de Trabajo Incluidas
              </h2>
              <ul className="space-y-2">
                {factura.ots?.map((ot) => (
                  <li
                    key={ot.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-500" size={18} />
                      <div>
                        <p className="font-semibold">{ot.custom_id}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {ot.title}
                        </p>
                      </div>
                    </div>
                    <Link to={`/ot/editar/${ot.id}`}>
                      <Button variant="outline" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Historial de Cobros</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                      ID Cobro
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                      Fecha
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">
                      Medio de Pago
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase">
                      Monto
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800">
                  {factura.cobros?.map((cobro) => (
                    <tr key={cobro.id}>
                      <td className="px-4 py-3 font-mono text-sm">
                        {cobro.id}
                      </td>
                      <td className="px-4 py-3">{formatDate(cobro.fecha)}</td>
                      <td className="px-4 py-3">{cobro.medio_de_pago}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(cobro.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(!factura.cobros || factura.cobros.length === 0) && (
              <p className="text-center text-gray-500 py-4">
                No hay cobros registrados para esta factura.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FacturaDetail;
