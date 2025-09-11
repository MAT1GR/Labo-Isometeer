// RUTA: consultar/src/pages/FacturaDetail.tsx

import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  facturacionService,
  Factura,
  Cobro,
  CreateCobroData,
  CobroUpdateData,
  FacturaUpdateData,
} from "../services/facturacionService";
import { formatDateTime } from "../lib/utils";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import {
  ArrowLeft,
  Banknote,
  ChevronDown,
  FileText,
  PlusCircle,
  Edit,
  Trash2,
  Save,
  AlertTriangle,
} from "lucide-react";
import { cn } from "../lib/utils";
import { WorkOrder, Activity } from "../services/otService";
import ConfirmationModal from "../components/ui/ConfirmationModal";

// Helper para formatear la moneda. Usará la moneda que se le pase.
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

// Componente para el tag de estado (sin cambios)
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

// Componente para mostrar detalles de un cobro
const CobroDetail: React.FC<{
  cobro: Cobro;
  facturaMoneda: string;
  onEdit: (cobro: Cobro) => void;
  onDelete: (cobro: Cobro) => void;
}> = ({ cobro, facturaMoneda, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasDetails =
    cobro.identificacion_cobro ||
    cobro.ingresos_brutos ||
    cobro.iva ||
    cobro.impuesto_ganancias ||
    cobro.retencion_suss;

  return (
    <div className="border rounded-lg bg-gray-50 dark:bg-gray-700/50">
      <div className="p-4 flex justify-between items-center">
        <div>
          <p className="font-bold text-lg text-gray-800 dark:text-gray-100">
            {formatCurrency(cobro.monto, facturaMoneda)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {cobro.medio_de_pago}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(cobro)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(cobro)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
          {hasDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="mt-1"
            >
              Ver detalles{" "}
              <ChevronDown
                className={cn(
                  "ml-2 h-4 w-4 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </Button>
          )}
        </div>
      </div>
      {hasDetails && (
        <div
          className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            isOpen ? "max-h-96" : "max-h-0"
          )}
        >
          <div className="border-t dark:border-gray-600 p-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {cobro.identificacion_cobro && (
              <div>
                <span className="font-semibold">ID Cobro:</span>{" "}
                {cobro.identificacion_cobro}
              </div>
            )}
            {cobro.ingresos_brutos != null && (
              <div>
                <span className="font-semibold">IIBB:</span>{" "}
                {formatCurrency(cobro.ingresos_brutos, facturaMoneda)}
              </div>
            )}
            {cobro.iva != null && (
              <div>
                <span className="font-semibold">IVA:</span>{" "}
                {formatCurrency(cobro.iva, facturaMoneda)}
              </div>
            )}
            {cobro.impuesto_ganancias != null && (
              <div>
                <span className="font-semibold">Ganancias:</span>{" "}
                {formatCurrency(cobro.impuesto_ganancias, facturaMoneda)}
              </div>
            )}
            {cobro.retencion_suss != null && (
              <div>
                <span className="font-semibold">SUSS:</span>{" "}
                {formatCurrency(cobro.retencion_suss, facturaMoneda)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente para el acordeón de cada OT
const OTAccordion: React.FC<{ ot: WorkOrder; facturaMoneda: string }> = ({
  ot,
  facturaMoneda,
}) => {
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
            {ot.activities.map((act: Activity, index: number) => (
              <li key={index} className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  {act.name}
                </span>
                <span className="font-mono text-gray-800 dark:text-gray-100">
                  {formatCurrency(act.precio_sin_iva, facturaMoneda)}
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
  const [isEditingCobro, setIsEditingCobro] = useState<Cobro | null>(null);
  const [cobroToDelete, setCobroToDelete] = useState<Cobro | null>(null);
  const [isEditingObservations, setIsEditingObservations] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm();

  const medioDePago = watch("medio_de_pago");

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
    if (id && factura) {
      try {
        const finalMedioDePago =
          data.medio_de_pago === "Otro"
            ? data.otro_medio_de_pago
            : data.medio_de_pago;

        const cobroData = {
          monto: Number(data.monto),
          fecha: new Date(data.fecha).toISOString(),
          medio_de_pago: finalMedioDePago,
          moneda: factura.moneda, // Se toma siempre de la factura
          identificacion_cobro: data.identificacion_cobro || undefined,
          ingresos_brutos: data.ingresos_brutos
            ? Number(data.ingresos_brutos)
            : undefined,
          iva: data.iva ? Number(data.iva) : undefined,
          impuesto_ganancias: data.impuesto_ganancias
            ? Number(data.impuesto_ganancias)
            : undefined,
          retencion_suss: data.retencion_suss
            ? Number(data.retencion_suss)
            : undefined,
        };

        if (isEditingCobro) {
          await facturacionService.updateCobro(
            Number(id),
            isEditingCobro.id,
            cobroData
          );
          setIsEditingCobro(null);
        } else {
          await facturacionService.createCobro(Number(id), cobroData);
        }

        setIsAddingCobro(false);
        reset();
        await loadFactura();
      } catch (error) {
        console.error("Error al guardar el cobro:", error);
        alert("No se pudo registrar/actualizar el cobro.");
      }
    }
  };

  const handleDeleteCobro = async () => {
    if (!cobroToDelete || !id) return;
    try {
      await facturacionService.deleteCobro(Number(id), cobroToDelete.id);
      setCobroToDelete(null);
      await loadFactura();
    } catch (error) {
      console.error("Error al eliminar el cobro:", error);
      alert("No se pudo eliminar el cobro.");
    }
  };

  const handleEditCobro = (cobro: Cobro) => {
    setIsEditingCobro(cobro);
    setIsAddingCobro(true);
    setValue("monto", cobro.monto);
    setValue("fecha", cobro.fecha.split("T")[0]);
    setValue("medio_de_pago", cobro.medio_de_pago);
    if (cobro.medio_de_pago === "Otro") {
      setValue("otro_medio_de_pago", cobro.medio_de_pago);
    }
    setValue("identificacion_cobro", cobro.identificacion_cobro || "");
    setValue("ingresos_brutos", cobro.ingresos_brutos || "");
    setValue("iva", cobro.iva || "");
    setValue("impuesto_ganancias", cobro.impuesto_ganancias || "");
    setValue("retencion_suss", cobro.retencion_suss || "");
  };

  const handleSaveObservations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factura || !id) return;
    try {
      const form = e.target as HTMLFormElement;
      const observaciones = (form.observaciones as HTMLTextAreaElement).value;
      await facturacionService.updateFactura(Number(id), {
        observaciones: observaciones,
      });
      setIsEditingObservations(false);
      await loadFactura();
    } catch (error) {
      console.error("Error al guardar las observaciones:", error);
      alert("No se pudieron guardar las observaciones.");
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
                Tipo: {factura.tipo}
              </p>
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

          {factura.moneda === "USD" && (
            <div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 rounded-md flex items-center">
              <AlertTriangle className="h-5 w-5 mr-3" />
              <span className="font-semibold">Atención: </span> Los montos de
              esta factura están expresados en Dólares (USD).
            </div>
          )}

          <div className="mt-6 border-t pt-6 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Monto Neto
              </h3>
              <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                {formatCurrency(montoNeto, factura.moneda)}
              </p>
            </div>
            {factura.iva && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  IVA
                </h3>
                <p className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
                  {formatCurrency(factura.iva, factura.moneda)}
                </p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Monto Total
              </h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {formatCurrency(montoTotal, factura.moneda)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Monto Pagado
              </h3>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(montoPagado, factura.moneda)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Saldo Restante
              </h3>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(saldoRestante, factura.moneda)}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t pt-6 dark:border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Observaciones
              </h3>
              {!isEditingObservations ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingObservations(true)}
                  className="text-gray-500 hover:text-blue-500"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingObservations(false)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    form="observations-form"
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Guardar
                  </Button>
                </div>
              )}
            </div>
            {!isEditingObservations ? (
              <p className="text-gray-800 dark:text-gray-100 mt-1 whitespace-pre-wrap">
                {factura.observaciones || "Sin observaciones."}
              </p>
            ) : (
              <form id="observations-form" onSubmit={handleSaveObservations}>
                <textarea
                  id="observaciones"
                  name="observaciones"
                  defaultValue={factura.observaciones || ""}
                  rows={4}
                  className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </form>
            )}
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
                  <Button
                    onClick={() => {
                      setIsAddingCobro(true);
                      setIsEditingCobro(null);
                      reset({
                        fecha: new Date().toISOString().split("T")[0],
                      });
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Registrar Nuevo Cobro
                  </Button>
                ) : (
                  <form
                    onSubmit={handleSubmit(handleCobroSubmit)}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4"
                  >
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                      {isEditingCobro ? "Editar Cobro" : "Nuevo Cobro"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={`Monto (${factura.moneda})`}
                        type="number"
                        step="0.01"
                        {...register("monto", {
                          required: true,
                          max: isEditingCobro ? undefined : saldoRestante,
                        })}
                      />
                      <Input
                        label="Fecha"
                        type="date"
                        defaultValue={new Date().toISOString().split("T")[0]}
                        {...register("fecha", { required: true })}
                      />
                    </div>
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

                    <div
                      className={cn(
                        "transition-all duration-300 ease-in-out overflow-hidden",
                        medioDePago === "Otro"
                          ? "max-h-40 opacity-100"
                          : "max-h-0 opacity-0"
                      )}
                    >
                      {medioDePago === "Otro" && (
                        <Input
                          label="Especificar otro medio de pago"
                          {...register("otro_medio_de_pago", {
                            required: medioDePago === "Otro",
                          })}
                          className="mt-2"
                        />
                      )}
                    </div>

                    {/* <-- INPUTS ADICIONALES RESTAURADOS --> */}
                    <div className="border-t pt-4 space-y-4">
                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Detalles Adicionales (Opcional)
                      </h4>
                      <Input
                        label="Identificación del Cobro"
                        {...register("identificacion_cobro")}
                      />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Input
                          label="Ingresos Brutos"
                          type="number"
                          step="0.01"
                          {...register("ingresos_brutos")}
                        />
                        <Input
                          label="IVA"
                          type="number"
                          step="0.01"
                          {...register("iva")}
                        />
                        <Input
                          label="Ganancias"
                          type="number"
                          step="0.01"
                          {...register("impuesto_ganancias")}
                        />
                        <Input
                          label="Retención SUSS"
                          type="number"
                          step="0.01"
                          {...register("retencion_suss")}
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting
                          ? "Guardando..."
                          : isEditingCobro
                          ? "Actualizar Cobro"
                          : "Guardar Cobro"}
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setIsAddingCobro(false);
                          setIsEditingCobro(null);
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
                  <CobroDetail
                    key={cobro.id}
                    cobro={cobro}
                    facturaMoneda={factura.moneda}
                    onEdit={handleEditCobro}
                    onDelete={() => setCobroToDelete(cobro)}
                  />
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
                factura.ots.map((ot) => (
                  <OTAccordion
                    key={ot.id}
                    ot={ot}
                    facturaMoneda={factura.moneda}
                  />
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">
                  No hay OTs asociadas a esta factura.
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <ConfirmationModal
        isOpen={!!cobroToDelete}
        title="Confirmar eliminación de cobro"
        message={`¿Estás seguro de que deseas eliminar el cobro de ${formatCurrency(
          cobroToDelete?.monto || 0,
          factura.moneda
        )}? Esta acción es irreversible.`}
        onConfirm={handleDeleteCobro}
        onClose={() => setCobroToDelete(null)}
        confirmText="Eliminar"
      />
    </div>
  );
};

export default FacturaDetail;
