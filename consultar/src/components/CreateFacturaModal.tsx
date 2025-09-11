// RUTA: /consultar/src/components/CreateFacturaModal.tsx

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { facturacionService } from "../services/facturacionService";
import Input from "./ui/Input";
import Button from "./ui/Button";

interface FacturaFormData {
  numero_factura: string;
  monto: number;
  vencimiento: string;
}

interface CreateFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: number;
  clienteName: string;
  suggestedAmount: number;
  onFacturaCreated: (newFactura: { id: number }) => void;
}

const CreateFacturaModal: React.FC<CreateFacturaModalProps> = ({
  isOpen,
  onClose,
  clienteId,
  clienteName,
  suggestedAmount,
  onFacturaCreated,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<FacturaFormData>();

  useEffect(() => {
    if (isOpen) {
      setValue("monto", suggestedAmount >= 0 ? suggestedAmount : 0);
      setValue("vencimiento", new Date().toISOString().split("T")[0]);
    }
  }, [isOpen, suggestedAmount, setValue]);

  const onSubmit = async (data: FacturaFormData) => {
    if (!clienteId) {
      alert("Error: No se ha seleccionado un cliente.");
      return;
    }
    try {
      const newFactura = await facturacionService.createFactura({
        ...data,
        monto: Number(data.monto),
        cliente_id: clienteId,
      });
      onFacturaCreated(newFactura);
    } catch (error) {
      console.error("Error al crear la factura", error);
      alert("No se pudo crear la factura.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Crear Nueva Factura
        </h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
          Cliente: <span className="font-semibold">{clienteName}</span>
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Número de Factura"
            {...register("numero_factura", { required: true })}
            autoFocus
          />
          <Input
            label="Monto (sugerido por actividades)"
            type="number"
            step="0.01"
            {...register("monto", { required: true, valueAsNumber: true })}
          />
          <Input
            label="Fecha de Vencimiento"
            type="date"
            {...register("vencimiento", { required: true })}
          />
          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear Factura"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFacturaModal;
