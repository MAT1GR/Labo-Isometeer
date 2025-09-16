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
import {
  ActivitySquare,
  ClipboardList,
  PlusCircle,
  Trash2,
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

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
          <ClipboardList size={20} /> Actividades y Asignaciones
        </h2>
        <Button
          type="button"
          size="sm"
          onClick={() =>
            append({
              activity: "",
              assigned_users: [],
              normas: [{ value: "" }],
              precio_sin_iva: "" as any,
              currency: "ARS",
            })
          }
        >
          <PlusCircle className="h-4 w-4 mr-2" /> Agregar Actividad
        </Button>
      </div>
      <div className="space-y-6">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700/80"
          >
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <ActivitySquare size={20} className="text-blue-500" />
                Actividad #{index + 1}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-400 px-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              {/* --- Columna Izquierda --- */}
              <div className="flex flex-col gap-4">
                {/* Actividad */}
                <div>
                  <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                    Actividad
                  </label>
                  <select
                    {...register(`activities.${index}.activity`)}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
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
                {/* Asignar a */}
                <div>
                  <label className="text-sm font-medium mb-1 block dark:text-gray-300">
                    Asignar a
                  </label>
                  <Controller
                    control={control}
                    name={`activities.${index}.assigned_users` as any}
                    render={({ field }) => (
                      <MultiUserSelect
                        users={users}
                        selectedUserIds={(field.value || []).map(
                          (u: any) => u.id
                        )}
                        onChange={(userIds: number[]) => {
                          const selectedUsers = userIds
                            .map((id) => users.find((u) => u.id === id))
                            .filter(Boolean);
                          field.onChange(selectedUsers);
                        }}
                      />
                    )}
                  />
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
                    />
                    <select
                      {...register(`activities.${index}.currency`)}
                      className="p-2 border border-l-0 rounded-md rounded-l-none dark:bg-gray-700 dark:border-gray-600 h-[42px] focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {fields.length === 0 && (
          <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              No hay actividades agregadas.
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Haga clic en "Agregar Actividad" para comenzar.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default OTDetailActivities;
