import React, { useState } from "react";
import {
  useFieldArray,
  Controller,
  Control,
  UseFormRegister,
  useFormContext,
} from "react-hook-form";
import { WorkOrder } from "../../services/otService";
import { User } from "../../services/auth";
import { ActivityPoint } from "../../services/adminService";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import UserAssignmentModal from "../ui/UserAssignmentModal";
import {
  ActivitySquare,
  ClipboardList,
  PlusCircle,
  Trash2,
  Users as UsersIcon,
  Info as InfoIcon, // For "Falta iniciar"
} from "lucide-react";
import NormaFields from "../NormaFields";

interface OTDetailActivitiesProps {
  control: Control<WorkOrder>;
  register: UseFormRegister<WorkOrder>;
  isFormEditable: boolean;
  otMoneda?: "ARS" | "USD";
  users: User[];
  getAvailableActivities: (index: number) => ActivityPoint[];
}

const OTDetailActivities: React.FC<OTDetailActivitiesProps> = ({
  control,
  register,
  isFormEditable,
  otMoneda,
  users,
  getAvailableActivities,
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "activities" as never,
  });

  const { setValue, getValues } = useFormContext<WorkOrder>();

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [currentActivityIndex, setCurrentActivityIndex] = useState<number | null>(null);

  const handleOpenAssignmentModal = (index: number) => {
    setCurrentActivityIndex(index);
    setIsAssignmentModalOpen(true);
  };

  const handleConfirmAssignment = (selectedIds: number[]) => {
    if (currentActivityIndex !== null) {
      const selectedUsers = users.filter(u => selectedIds.includes(u.id));
      setValue(`activities.${currentActivityIndex}.assigned_users` as any, selectedUsers, { shouldDirty: true });
    }
    setIsAssignmentModalOpen(false);
    setCurrentActivityIndex(null);
  };

  const initialSelectedUserIds = currentActivityIndex !== null && getValues(`activities.${currentActivityIndex}.assigned_users`)
    ? (getValues(`activities.${currentActivityIndex}.assigned_users`) as User[]).map(u => u.id)
    : [];

  const handleAddActivity = () => {
    append({
      activity: "",
      assigned_users: [],
      normas: [{ value: "" }],
      precio_sin_iva: "" as any,
      currency: "ARS",
    });
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
          <ClipboardList size={20} /> Actividades y Asignaciones
        </h2>
        {/* Removed "Agregar Actividad" button from header to move it to the bottom */}
      </div>
      <div className="space-y-6">
        {fields.map((field, index) => {
          const assignedUsersCount = (getValues(`activities.${index}.assigned_users`) || []).length;
          const activityStatus = field.status || "pendiente"; // Assuming default status
          
          return (
            <div
              key={field.id}
              className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700/80"
            >
              <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <ActivitySquare size={20} className="text-blue-500" />
                  {/* Display activity name */}
                  {getValues(`activities.${index}.activity`) || `Actividad #${index + 1}`}
                </h3>
                {isFormEditable && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-red-500 hover:text-red-700 dark:hover:text-red-400 px-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* --- Columna Izquierda --- */}
                <div className="flex flex-col gap-4">
                  {/* Activity Selector */}
                  <div>
                    <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                      Tipo de Actividad
                    </label>
                    <select
                      {...register(`activities.${index}.activity`)}
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!isFormEditable}
                    >
                      <option value="">Seleccionar...</option>
                      {getAvailableActivities(index).map((opt) => (
                        <option key={opt.id} value={opt.activity}>
                          {opt.activity}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Normas */}
                  <div className="flex-grow">
                    <NormaFields
                      activityIndex={index}
                      control={control}
                      register={register}
                    />
                  </div>
                </div>

                {/* --- Columna Derecha --- */}
                <div className="flex flex-col gap-4">
                  {/* Asignar a & Status */}
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium dark:text-gray-300">
                        Asignado a ({assignedUsersCount})
                      </p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                        activityStatus === 'pendiente' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        activityStatus === 'en_progreso' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        activityStatus === 'finalizada' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        <InfoIcon size={12} /> {activityStatus === 'pendiente' ? 'Falta iniciar' : activityStatus}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="default" // Use default variant for primary action
                      onClick={() => handleOpenAssignmentModal(index)}
                      disabled={!isFormEditable}
                      className="w-full justify-center" // Center content
                    >
                      <UsersIcon className="mr-2 h-4 w-4" /> Asignar Usuarios
                    </Button>
                  </div>

                  {/* Precio */}
                  <div>
                    <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                      Precio (Sin IVA)
                    </label>
                    <div className="flex items-center">
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`activities.${index}.precio_sin_iva`, {
                          valueAsNumber: true,
                        })}
                        placeholder="Ej: 15000"
                        className="w-full rounded-r-none"
                        disabled={!isFormEditable}
                      />
                      <select
                        {...register(`activities.${index}.currency`)}
                        className="p-2 border border-l-0 rounded-md rounded-l-none dark:bg-gray-700 dark:border-gray-600 h-[42px] focus:ring-blue-500 focus:border-blue-500"
                        disabled={!isFormEditable}
                      >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {fields.length === 0 && (
          <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              No hay actividades agregadas.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Haga clic en "Seleccionar Actividades" para comenzar.
            </p>
          </div>
        )}
      </div>
      {/* "Seleccionar Actividades" button at the bottom of the Card */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="secondary"
          onClick={handleAddActivity}
          disabled={!isFormEditable}
          className="w-full justify-center"
        >
          <PlusCircle className="mr-2 h-5 w-5" /> Seleccionar Actividades
        </Button>
      </div>


      {isAssignmentModalOpen && (
        <UserAssignmentModal
          isOpen={isAssignmentModalOpen}
          onClose={() => setIsAssignmentModalOpen(false)}
          allUsers={users}
          initialSelectedUserIds={initialSelectedUserIds}
          onConfirmAssignment={handleConfirmAssignment}
        />
      )}
    </Card>
  );
};

export default OTDetailActivities;
