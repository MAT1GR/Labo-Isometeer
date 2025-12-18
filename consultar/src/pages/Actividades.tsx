// RUTA: /consultar/src/pages/AdminPuntajes.tsx

import React, { useState, useEffect } from "react";
import { useTitle } from "../contexts/TitleContext";
import { useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import { adminService, ActivityPoint } from "../services/adminService";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Award, Save, PlusCircle, Trash2, Edit, X } from "lucide-react";
import ConfirmationModal from "../components/ui/ConfirmationModal";

type ActivityFormData = {
  activity: string;
  points: number;
};

const Actividades: React.FC = () => {
    const { setTitle } = useTitle();
  useEffect(() => {
    setTitle("Gestión de Actividades");
  }, [setTitle]);

  const {
    data: activities,
    error,
    isLoading,
  } = useSWR<ActivityPoint[]>("/admin/puntajes", adminService.getPuntajes);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activityToDelete, setActivityToDelete] =
    useState<ActivityPoint | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormData>();

  const handleAddNew = () => {
    reset({ activity: "", points: 0 });
    setIsCreating(true);
    setEditingId(null);
  };

  const handleEdit = (activity: ActivityPoint) => {
    setEditingId(activity.id);
    setValue("activity", activity.activity);
    setValue("points", activity.points);
    setIsCreating(false);
  };

  const handleCancel = () => {
    reset({ activity: "", points: 0 });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleDeleteRequest = (activity: ActivityPoint) => {
    setActivityToDelete(activity);
  };

  const handleConfirmDelete = async () => {
    if (!activityToDelete) return;
    try {
      await adminService.deleteActivity(activityToDelete.id);
      mutate("/admin/puntajes");
      setActivityToDelete(null);
    } catch (err) {
      alert("Error al eliminar la actividad.");
    }
  };

  const onSubmit = async (data: ActivityFormData) => {
    try {
      if (isCreating) {
        await adminService.createActivity(data);
      } else if (editingId) {
        await adminService.updateActivity(editingId, data);
      }
      mutate("/admin/puntajes");
      handleCancel();
    } catch (err: any) {
      alert(err.response?.data?.error || "Ocurrió un error.");
    }
  };

  if (isLoading) return <div>Cargando actividades...</div>;
  if (error) return <div>Error al cargar las actividades.</div>;

  return (
    <>
      <ConfirmationModal
        isOpen={!!activityToDelete}
        onClose={() => setActivityToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Actividad"
        message={`¿Estás seguro de que quieres eliminar la actividad "${activityToDelete?.activity}"?`}
      />
      <div className="space-y-6">
              <div className="flex justify-end">
                {/* === INICIO: Botón Agregado === */}
                {!isCreating && !editingId && (
                  <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar Actividad
                  </Button>
                )}
                {/* === FIN: Botón Agregado === */}
              </div>
        {(isCreating || editingId) && (
          <Card>
            <form onSubmit={handleSubmit(onSubmit)}>
              <h2 className="text-xl font-semibold mb-4">
                {isCreating ? "Nueva Actividad" : "Editando Actividad"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr,auto] gap-4 items-end">
                <Input
                  label="Nombre de la Actividad"
                  {...register("activity", {
                    required: "El nombre es requerido",
                  })}
                  error={errors.activity?.message}
                />
                <Input
                  label="Puntos"
                  type="number"
                  step="0.1"
                  {...register("points", {
                    valueAsNumber: true,
                    required: "Los puntos son requeridos",
                  })}
                  error={errors.points?.message}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button variant="ghost" type="button" onClick={handleCancel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">
              Lista de Actividades y Puntajes
            </h2>
          </div>
          <div className="space-y-2">
            {activities?.map((act) => (
              <div
                key={act.id}
                className="grid grid-cols-[1fr,150px,auto] items-center gap-4 p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <p className="font-medium text-gray-800 dark:text-gray-200">
                  {act.activity}
                </p>
                <p className="text-center font-semibold text-blue-600 dark:text-blue-400">
                  {act.points} pts
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(act)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteRequest(act)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
};

export default Actividades;
