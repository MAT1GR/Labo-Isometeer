// RUTA: /cliente/src/pages/Clientes.tsx

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { clientService, Client } from "../services/clientService";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { PlusCircle, Users, Trash2 } from "lucide-react";
import useSWR, { mutate } from "swr";
import { fetcher } from "../api/axiosInstance";

type ClientFormData = Omit<Client, "id" | "unique_code">;

const Clientes: React.FC = () => {
  const {
    data: clients,
    error,
    isLoading,
  } = useSWR<Client[]>("/clients", fetcher);

  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ClientFormData>();

  const onSubmit = async (data: ClientFormData) => {
    try {
      setFormError(null);
      await clientService.createClient(data);
      reset();
      mutate("/clients");
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (clientId: number) => {
    if (
      window.confirm(
        "¿Seguro? Se eliminarán también las Órdenes de Trabajo de este cliente."
      )
    ) {
      try {
        await clientService.deleteClient(clientId);
        mutate("/clients");
      } catch (err: any) {
        alert(err.message || "Error al eliminar el cliente.");
      }
    }
  };

  if (error) return <div>Error al cargar los clientes.</div>;
  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Users /> Lista de Clientes
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID Fiscal
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clients?.map((client) => (
                    <tr key={client.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {client.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {client.fiscal_id_type} {client.fiscal_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(client.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
        <div>
          <Card>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <PlusCircle /> Crear Nuevo Cliente
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Código *"
                {...register("code", { required: true })}
              />
              <Input
                label="Nombre / Razón Social *"
                {...register("name", { required: true })}
              />
              <Input label="Dirección" {...register("address")} />
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Tipo ID Fiscal
                </label>
                <select
                  {...register("fiscal_id_type")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Ninguno</option>
                  <option value="CUIT">CUIT</option>
                  <option value="CUIL">CUIL</option>
                  <option value="DNI">DNI</option>
                </select>
              </div>
              <Input label="Número ID Fiscal" {...register("fiscal_id")} />
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creando..." : "Crear Cliente"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Clientes;
