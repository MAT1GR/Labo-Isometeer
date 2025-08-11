// RUTA: /cliente/src/pages/AdminPuntajes.tsx

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import useSWR, { mutate } from "swr";
import { adminService, ActivityPoint } from "../services/adminService";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Award, Save, Info } from "lucide-react";

type FormValues = {
  puntajes: ActivityPoint[];
};

const AdminPuntajes: React.FC = () => {
  const { data, error, isLoading } = useSWR<ActivityPoint[]>(
    "/admin/puntajes",
    adminService.getPuntajes
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      puntajes: [],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "puntajes",
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      reset({ puntajes: data });
    }
  }, [data, reset]);

  const onSubmit = async (formData: FormValues) => {
    setFormError(null);
    setSuccessMessage(null);
    try {
      await adminService.updatePuntajes(formData.puntajes);
      mutate("/admin/puntajes");
      setSuccessMessage("¡Puntajes actualizados correctamente!");
    } catch (err) {
      setFormError("Hubo un error al actualizar los puntajes.");
    }
  };

  if (isLoading) return <div>Cargando puntajes...</div>;
  if (error) return <div>Error al cargar la configuración de puntajes.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gestión de Puntajes de OT</h1>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">
              Valores de Puntos por Actividad
            </h2>
          </div>
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Estos valores determinan los puntos que se asignan a los
                empleados al cerrar una Orden de Trabajo que contenga estas
                actividades.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr,150px] items-center gap-4 p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <label className="font-medium text-gray-800 dark:text-gray-200">
                  {field.activity}
                </label>
                <Input
                  type="number"
                  step="0.1"
                  {...control.register(`puntajes.${index}.points`, {
                    valueAsNumber: true,
                  })}
                  className="text-center"
                />
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end items-center gap-4">
            {successMessage && (
              <p className="text-sm text-green-600">{successMessage}</p>
            )}
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AdminPuntajes;
