// RUTA: /cliente/src/pages/ClienteDetail.tsx

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { clientService, Client } from "../services/clientService";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { ArrowLeft, Save, PlusCircle, Trash2 } from "lucide-react";
import { mutate } from "swr";

const ClienteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<Client>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "contacts",
  });

  useEffect(() => {
    if (id) {
      clientService.getClientById(Number(id)).then((data) => {
        reset(data);
      });
    }
  }, [id, reset]);

  const onSubmit = async (data: Client) => {
    try {
      await clientService.updateClient(Number(id), data);
      mutate("/clients");
      navigate("/clientes");
    } catch (error) {
      alert("Hubo un error al actualizar el cliente.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Editando Cliente</h1>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/clientes")}
          >
            Volver
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !isDirty}
            className="flex items-center gap-2"
          >
            <Save className="h-5 w-5" />
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 p-6 rounded-lg shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Nº Cliente *"
            {...register("code", { required: true })}
          />
          <Input label="Empresa *" {...register("name", { required: true })} />
          <Input label="Dirección" {...register("address")} />
          <div className="flex items-end gap-4 col-span-2">
            <div className="flex-1">
              <label className="text-sm font-medium dark:text-gray-300">
                Tipo ID Fiscal
              </label>
              <select
                {...register("fiscal_id_type")}
                className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">Ninguno</option>
                <option value="CUIT">CUIT</option>
                <option value="CUIL">CUIL</option>
                <option value="DNI">DNI</option>
              </select>
            </div>
            <div className="flex-1">
              <Input label="Número ID Fiscal" {...register("fiscal_id")} />
            </div>
          </div>
        </div>

        <div className="border-t dark:border-gray-700 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              Contactos
            </h2>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                append({ type: "", name: "", email: "", phone: "" })
              }
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Agregar Contacto
            </Button>
          </div>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md"
              >
                <Input
                  placeholder="Tipo (Ej: Admin)"
                  {...register(`contacts.${index}.type`)}
                />
                <Input
                  placeholder="Contacto"
                  {...register(`contacts.${index}.name`)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  {...register(`contacts.${index}.email`)}
                />
                <Input
                  placeholder="Teléfono"
                  {...register(`contacts.${index}.phone`)}
                />
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
};

export default ClienteDetail;
