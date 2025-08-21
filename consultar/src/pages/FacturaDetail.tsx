// RUTA: /consultar/src/pages/FacturaDetail.tsx

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { facturacionService, Factura } from "../services/facturacionService";
import { formatCurrency, formatDateTime } from "../lib/utils";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import {
  ArrowLeft,
  Banknote,
  ChevronDown,
  FileText,
  PlusCircle,
} from "lucide-react";
import { cn } from "../lib/utils";
// CORRECCIÓN: Importamos los tipos WorkOrder y Activity
import { WorkOrder, Activity } from "../services/otService";

// Componente para el tag de estado
const StatusTag: React.FC<{ status: string }> = ({ status }) => {
  const statusStyles: { [key: string]: string } = {
    pagada: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    vencida: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    pendiente:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };
  const style = statusStyles[status] || "bg-gray-100 text-gray-800";
  return (
    <span
      className={`px-4 py-2 rounded-full text-sm font-semibold capitalize ${style}`}
    >
      {status}
    </span>
  );
};

// Componente para el acordeón de cada OT
const OTAccordion: React.FC<{ ot: WorkOrder }> = ({ ot }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!ot.activities || ot.activities.length === 0) {
    return (
      <Link
        to={`/ot/editar/${ot.id}`}
        className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <p className="font-semibold text-blue-600 dark:text-blue-400">
          {ot.custom_id}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{ot.product}</p>
      </Link>
    );
  }

  return (
    <div className="border rounded-lg bg-gray-50 dark:bg-gray-700/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div>
          <p className="font-semibold text-blue-600 dark:text-blue-400">
            {ot.custom_id}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {ot.product}
          </p>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t dark:border-gray-600 p-3">
          <ul className="list-disc pl-5 text-sm space-y-1">
            {/* CORRECCIÓN: Usamos el tipo 'Activity' importado */}
            {ot.activities.map((act: Activity, index: number) => (
              <li key={index} className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  {act.name}
                </span>
                <span className="font-mono text-gray-800 dark:text-gray-100">
                  {formatCurrency(act.precio_sin_iva)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const FacturaDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [factura, setFactura] = useState<Factura | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddingCobro, setIsAddingCobro] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm();

  const loadFactura = async () => {
    if (id) {
      try {
        const data = await facturacionService.getFacturaById(Number(id));
        setFactura(data);
      } catch (err) {
        setError("No se pudo cargar la factura.");
        console.error(err);
      }
    }
  };

  useEffect(() => {
    loadFactura();
  }, [id]);

  const handleCobroSubmit = async (data: any) => {
    if (id) {
      try {
        await facturacionService.createCobro(Number(id), {
          ...data,
          monto: Number(data.monto),
        });
        reset();
        setIsAddingCobro(false);
        await loadFactura();
      } catch (error) {
        console.error("Error al crear el cobro:", error);
        alert("No se pudo registrar el cobro.");
      }
    }
  };

  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!factura) return <div className="p-4">Cargando...</div>;

  const montoTotal = factura.monto;
  const montoPagado =
    factura.cobros?.reduce((acc, cobro) => acc + cobro.monto, 0) || 0;
  const saldoRestante = montoTotal - montoPagado;
  const montoNeto = factura.monto - (factura.iva || 0);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Button
        variant="outline"
        onClick={() => navigate("/facturacion")}
        className="flex items-center"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Facturación
      </Button>

      <Card>
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                Factura #{factura.numero_factura}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Cliente:{" "}
                <Link
                  to={`/clientes/editar/${factura.cliente_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {factura.cliente_name}
                </Link>
              </p>
            </div>
            <div className="text-right mt-4 md:mt-0">
              <StatusTag status={factura.estado} />
            </div>
          </div>

          <div className="mt-6 border-t pt-6 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Monto Neto
              </h3>
              <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                {formatCurrency(montoNeto)}
              </p>
            </div>
            {factura.iva && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  IVA
                </h3>
                <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                  {formatCurrency(factura.iva)}
                </p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Monto Total
              </h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {formatCurrency(montoTotal)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Monto Pagado
              </h3>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(montoPagado)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Saldo Restante
              </h3>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(saldoRestante)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <Banknote /> Historial de Cobros
            </h2>
            {saldoRestante > 0 && (
              <div className="mb-6">
                {!isAddingCobro ? (
                  <Button onClick={() => setIsAddingCobro(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Registrar Nuevo Cobro
                  </Button>
                ) : (
                  <form
                    onSubmit={handleSubmit(handleCobroSubmit)}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4"
                  >
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                      Nuevo Cobro
                    </h3>
                    <Input
                      label="Monto"
                      type="number"
                      step="0.01"
                      {...register("monto", {
                        required: true,
                        max: saldoRestante,
                      })}
                    />
                    <Input
                      label="Fecha"
                      type="date"
                      defaultValue={new Date().toISOString().split("T")[0]}
                      {...register("fecha", { required: true })}
                    />
                    <div>
                      <label className="text-sm font-medium dark:text-gray-300">
                        Medio de Pago
                      </label>
                      <select
                        {...register("medio_de_pago", { required: true })}
                        className="w-full mt-1 p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600"
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta de Crédito">
                          Tarjeta de Crédito
                        </option>
                        <option value="Tarjeta de Débito">
                          Tarjeta de Débito
                        </option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div className="flex gap-4">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Guardando..." : "Guardar"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddingCobro(false);
                          reset();
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div className="space-y-4">
              {factura.cobros && factura.cobros.length > 0 ? (
                factura.cobros.map((cobro) => (
                  <div
                    key={cobro.id}
                    className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-lg text-gray-800 dark:text-gray-100">
                        {formatCurrency(cobro.monto)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {cobro.medio_de_pago}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateTime(cobro.fecha)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  No hay cobros registrados para esta factura.
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <FileText /> Órdenes de Trabajo Vinculadas
            </h2>
            <div className="space-y-2">
              {factura.ots && factura.ots.length > 0 ? (
                factura.ots.map((ot) => <OTAccordion key={ot.id} ot={ot} />)
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  No hay OTs asociadas a esta factura.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FacturaDetail;
