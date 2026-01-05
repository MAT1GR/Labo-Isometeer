// RUTA: /consultar/src/components/NormaFields.tsx

import React from "react";
import { useFieldArray } from "react-hook-form";
import Input from "./ui/Input";
import Button from "./ui/Button";
import { Plus, X } from "lucide-react";

interface NormaFieldsProps {
  activityIndex: number;
  control: any;
  register: any;
}

const NormaFields: React.FC<NormaFieldsProps> = ({
  activityIndex,
  control,
  register,
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `activities.${activityIndex}.normas`,
  });

  return (
    <div>
      <label className="text-sm font-medium mb-1 dark:text-gray-300">
        Normas
      </label>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input
              {...register(`activities.${activityIndex}.normas.${index}.value`)}
              placeholder="Ej: IEC 60601"
              className="w-full"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => (fields.length > 1 ? remove(index) : null)}
              disabled={fields.length <= 1}
            >
              <X className="h-4 w-4" />
            </Button>
            {index === fields.length - 1 && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => append({ value: "" })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NormaFields;
