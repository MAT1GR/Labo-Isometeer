// RUTA: /consultar/src/pages/FacturaDetail.tsx

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
// --- IMPORTAMOS LOS NUEVOS TIPOS ---
import {
  facturacionService,
  Factura,
  Cobro,
  CreateCobroData,
  CobroUpdateData, // Importamos el nuevo tipo
} from "../services/facturacionService";
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
  Edit, // Añadimos el icono de edición
  Trash2, // Añadimos el icono de borrado
} from "lucide-react";
import { cn } from "../lib/utils";
import { WorkOrder, Activity } from "../services/otService";
import ConfirmationModal from "../components/ui/ConfirmationModal";

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

// Componente para mostrar detalles de un cobro
const CobroDetail: React.FC<{
  cobro: Cobro;
  onEdit: (cobro: Cobro) => void;
  onDelete: (cobro: Cobro) => void;
}> = ({ cobro, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Esta validación ahora funcionará correctamente
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
            {formatCurrency(cobro.monto)}
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
                {formatCurrency(cobro.ingresos_brutos)}
              </div>
            )}
            {cobro.iva != null && (
              <div>
                <span className="font-semibold">IVA:</span>{" "}
                {formatCurrency(cobro.iva)}
              </div>
            )}
            {cobro.impuesto_ganancias != null && (
              <div>
                <span className="font-semibold">Ganancias:</span>{" "}
                {formatCurrency(cobro.impuesto_ganancias)}
              </div>
            )}
            {cobro.retencion_suss != null && (
              <div>
                <span className="font-semibold">SUSS:</span>{" "}
                {formatCurrency(cobro.retencion_suss)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
  const [isEditingCobro, setIsEditingCobro] = useState<Cobro | null>(null);
  const [cobroToDelete, setCobroToDelete] = useState<Cobro | null>(null);

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
    if (id) {
      try {
        const finalMedioDePago =
          data.medio_de_pago === "Otro"
            ? data.otro_medio_de_pago
            : data.medio_de_pago;

        const cobroData: CreateCobroData = {
          monto: Number(data.monto),
          fecha: new Date(data.fecha).toISOString(),
          medio_de_pago: finalMedioDePago,
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
          // Lógica para editar un cobro
          await facturacionService.updateCobro(
            Number(id),
            isEditingCobro.id,
            cobroData
          );
          setIsEditingCobro(null);
        } else {
          // Lógica para crear un nuevo cobro
          await facturacionService.createCobro(Number(id), cobroData);
          setIsAddingCobro(false);
        }

        reset();
        await loadFactura(); // Recarga la factura para ver los cambios
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
      await loadFactura(); // Recarga la factura
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
          {factura.observaciones && (
            <div className="mt-6 border-t pt-6 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Observaciones
              </h3>
              <p className="text-gray-800 dark:text-gray-100 mt-1">
                {factura.observaciones}
              </p>
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <Banknote /> Historial de Cobros
            </h2>
            {saldoRestante > 0 && !isEditingCobro && (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {isSubmitting ? "Guardando..." : "Guardar Cobro"}
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
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
            {isEditingCobro && (
              <div className="mb-6">
                <form
                  onSubmit={handleSubmit(handleCobroSubmit)}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-4"
                >
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                    Editar Cobro
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Monto"
                      type="number"
                      step="0.01"
                      {...register("monto", { required: true })}
                    />
                    <Input
                      label="Fecha"
                      type="date"
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
                      {isSubmitting ? "Actualizando..." : "Actualizar Cobro"}
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setIsEditingCobro(null);
                        setIsAddingCobro(false);
                        reset();
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            )}
            <div className="space-y-4">
              {factura.cobros && factura.cobros.length > 0 ? (
                factura.cobros.map((cobro) => (
                  <CobroDetail
                    key={cobro.id}
                    cobro={cobro}
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

      <ConfirmationModal
        isOpen={!!cobroToDelete}
        title="Confirmar eliminación de cobro"
        message={`¿Estás seguro de que deseas eliminar el cobro de ${formatCurrency(
          cobroToDelete?.monto || 0
        )}? Esta acción es irreversible.`}
        onConfirm={handleDeleteCobro}
        onClose={() => setCobroToDelete(null)}
        confirmText="Eliminar"
      />
    </div>
  );
};

export default FacturaDetail;
