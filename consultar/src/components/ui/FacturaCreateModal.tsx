// RUTA: /consultar/src/components/ui/FacturaCreateModal.tsx

import { Dialog } from "@headlessui/react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Factura } from "../../services/facturacionService";
import Button from "./Button";
import Input from "./Input";
import { X } from "lucide-react";
import { useEffect } from "react";

// CORRECCIÓN: Volvemos a usar 'created_at' como en la interfaz oficial.
type FacturaFormInputs = Pick<
  Factura,
  "numero_factura" | "monto" | "created_at" | "estado"
>;

interface FacturaCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FacturaFormInputs) => void;
  initialData?: Partial<FacturaFormInputs>;
}

const FacturaCreateModal: React.FC<FacturaCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FacturaFormInputs>({
    defaultValues: {
      estado: "pendiente",
      ...initialData,
      // CORRECCIÓN: El valor por defecto ahora es para 'created_at'.
      created_at:
        initialData?.created_at || new Date().toISOString().split("T")[0],
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
        // CORRECCIÓN: Se resetea el campo 'created_at'.
        created_at:
          initialData.created_at || new Date().toISOString().split("T")[0],
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit: SubmitHandler<FacturaFormInputs> = (data) => {
    onSubmit(data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <div className="flex justify-between items-center">
            <Dialog.Title className="text-xl font-bold">
              Crear Nueva Factura
            </Dialog.Title>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X />
            </Button>
          </div>
          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="mt-4 space-y-4"
          >
            <Input
              label="Número de Factura"
              {...register("numero_factura", {
                required: "Este campo es requerido",
              })}
              error={errors.numero_factura?.message}
            />
            <Input
              label="Monto"
              type="number"
              step="0.01"
              {...register("monto", {
                required: "Este campo es requerido",
                valueAsNumber: true,
                min: { value: 0, message: "El monto no puede ser negativo." },
              })}
              error={errors.monto?.message}
            />
            <Input
              label="Fecha de Emisión"
              type="date"
              // CORRECCIÓN: El formulario ahora registra 'created_at'.
              {...register("created_at", {
                required: "Este campo es requerido",
              })}
              error={errors.created_at?.message}
            />
            <div>
              <label className="text-sm font-medium dark:text-gray-300">
                Estado
              </label>
              <select
                {...register("estado")}
                className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="pendiente">Pendiente</option>
                <option value="pagada">Pagada</option>
                <option value="vencida">Vencida</option>
                <option value="anulada">Anulada</option>
              </select>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Factura</Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default FacturaCreateModal;
