// RUTA: /cliente/src/pages/ClienteDetail.tsx (VERSIÓN DE DIAGNÓSTICO)

import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { clientService, Client } from "../services/clientService";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { ArrowLeft, Save } from "lucide-react";
import { mutate } from "swr";

const ClienteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty, errors },
  } = useForm<Client>();

  console.log("--- RENDERIZANDO Componente ClienteDetail ---");
  console.log("¿El formulario está 'sucio' (modificado)?", isDirty);
  console.log("¿El formulario se está enviando?", isSubmitting);
  if (Object.keys(errors).length > 0) {
    console.error("Errores de validación en el formulario:", errors);
  }

  useEffect(() => {
    console.log("useEffect: Se detectó un ID, buscando datos del cliente...");
    if (id) {
      clientService
        .getClientById(Number(id))
        .then((data) => {
          console.log(
            "useEffect: Datos del cliente recibidos del servidor:",
            data
          );
          reset(data);
          console.log(
            "useEffect: El formulario se ha reseteado con los datos del servidor."
          );
        })
        .catch((err) => {
          console.error(
            "useEffect: ERROR al buscar los datos del cliente:",
            err
          );
        });
    }
  }, [id, reset]);

  const onSubmit = async (data: Client) => {
    console.log("--- onSubmit: Se ha disparado el envío del formulario ---");
    console.log("Datos que se van a enviar:", data);
    try {
      await clientService.updateClient(Number(id), data);
      console.log(
        "onSubmit: El cliente se actualizó con éxito en el servidor."
      );
      mutate("/clients");
      console.log(
        "onSubmit: Se ha pedido a SWR que refresque la lista de clientes."
      );
      navigate("/clientes");
    } catch (error) {
      console.error("onSubmit: ERROR al actualizar el cliente:", error);
      alert("Hubo un error al actualizar el cliente.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 bg-gray-50 p-6 rounded-lg"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Editando Cliente</h1>
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/clientes")}
          >
            Cancelar
          </Button>
          {/* He quitado !isDirty temporalmente para asegurarnos de que el botón siempre esté activo */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <Save className="h-5 w-5" />
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Nº Cliente *"
            {...register("code", { required: true })}
          />
          <Input label="Empresa *" {...register("name", { required: true })} />
          <Input label="Dirección" {...register("address")} />
          <Input label="Contacto" {...register("contacts.0.name")} />
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">
                Tipo ID Fiscal
              </label>
              <select
                {...register("fiscal_id_type")}
                className="w-full mt-1 p-2 border rounded-md"
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
      </div>
    </form>
  );
};

export default ClienteDetail;
