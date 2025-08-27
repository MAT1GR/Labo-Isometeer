import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { presupuestoService } from "../services/presupuestoService";
import  Button  from "../components/ui/Button";
import  Input  from "../components/ui/Input";
import ClienteSelect from "../components/ui/ClienteSelect";

interface FormData {
  cliente_id: number;
  producto: string;
  tipo_servicio: string;
  norma: string;
  entrega_dias: number;
  precio: number;
}

const PresupuestoCreate: React.FC = () => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await presupuestoService.create(data);
      navigate("/presupuestos");
    } catch (error) {
      console.error("Error al crear el presupuesto:", error);
      alert("No se pudo crear el presupuesto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Crear Nuevo Presupuesto</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Cliente</label>
          <ClienteSelect
            onChange={(selectedId: number | undefined) => {
              if (selectedId !== undefined) setValue("cliente_id", selectedId);
            }}
            clients={[]}
            selectedClientId={undefined}
          />
          {errors.cliente_id && (
            <p className="text-red-500 text-xs mt-1">
              Debe seleccionar un cliente.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Producto</label>
          <Input {...register("producto", { required: true })} />
          {errors.producto && (
            <p className="text-red-500 text-xs mt-1">
              El producto es requerido.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Tipo de Servicio</label>
          <Input {...register("tipo_servicio", { required: true })} />
          {errors.tipo_servicio && (
            <p className="text-red-500 text-xs mt-1">
              El tipo de servicio es requerido.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Norma</label>
          <Input {...register("norma")} />
        </div>

        <div>
          <label className="block text-sm font-medium">Entrega (días)</label>
          <Input
            type="number"
            {...register("entrega_dias", {
              required: true,
              valueAsNumber: true,
            })}
          />
          {errors.entrega_dias && (
            <p className="text-red-500 text-xs mt-1">
              Los días de entrega son requeridos.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium">Precio (Sin IVA)</label>
          <Input
            type="number"
            step="0.01"
            {...register("precio", { required: true, valueAsNumber: true })}
          />
          {errors.precio && (
            <p className="text-red-500 text-xs mt-1">El precio es requerido.</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Presupuesto"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PresupuestoCreate;
