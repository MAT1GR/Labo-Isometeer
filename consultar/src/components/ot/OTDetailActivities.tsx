// RUTA: /consultar/src/components/ot/OTDetailActivities.tsx

import React from "react";
import {
  useFieldArray,
  Controller,
  Control,
  UseFormRegister,
} from "react-hook-form";
import { WorkOrder } from "../../services/otService";
import { User } from "../../services/auth";
import { ActivityPoint } from "../../services/adminService";
import Card from "../ui/Card";
import Button from "../ui/Button";
import Input from "../ui/Input";
import MultiUserSelect from "../ui/MultiUserSelect";
import { ClipboardList, PlusCircle, Trash2 } from "lucide-react";

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

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <ClipboardList size={20} /> Actividades y Asignaciones
          </h2>
          {isFormEditable && (
            <Button
              type="button"
              size="sm"
              onClick={() => append({ activity: "", assigned_to: [] })}
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Agregar Actividad
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr,auto] gap-4 items-start">
                <div>
                  <label className="text-sm font-medium mb-1 dark:text-gray-300">
                    Actividad
                  </label>
                  <select
                    {...register(`activities.${index}.activity`)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
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
                <div>
                  <label className="text-sm font-medium mb-1 dark:text-gray-300">
                    Asignar a
                  </label>
                  <Controller
                    control={control}
                    name={`activities.${index}.assigned_to` as any}
                    render={({ field }) => (
                      <MultiUserSelect
                        users={users}
                        selectedUserIds={field.value || []}
                        onChange={field.onChange}
                        disabled={!isFormEditable}
                      />
                    )}
                  />
                </div>
                {isFormEditable && (
                  <div className="self-end">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Norma"
                  {...register(`activities.${index}.normas` as const)}
                  disabled={!isFormEditable}
                  placeholder="Ej: IEC 60601"
                />
                <Input
                  label={`Precio (Sin IVA) en ${otMoneda || "ARS"}`}
                  type="number"
                  step="0.01"
                  {...register(`activities.${index}.precio_sin_iva`, {
                    valueAsNumber: true,
                  })}
                  disabled={!isFormEditable}
                  placeholder="Ej: 15000"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default OTDetailActivities;
