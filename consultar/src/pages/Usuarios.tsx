// RUTA: /cliente/src/pages/Usuarios.tsx

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authService, User } from "../services/auth";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { PlusCircle, Users, Trash2 } from "lucide-react";
import useSWR, { mutate } from "swr"; // Importamos useSWR y mutate
import { fetcher } from "../api/axiosInstance"; // Importamos el fetcher

const userSchema = z.object({
  name: z.string().min(3, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["empleado", "director", "administrador"]),
});

type UserFormData = z.infer<typeof userSchema>;

const Usuarios: React.FC = () => {
  // Usamos SWR para obtener y manejar los datos de los usuarios
  const { data: users, error, isLoading } = useSWR<User[]>("/users", fetcher);

  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: "empleado" },
  });

  const onSubmit = async (data: UserFormData) => {
    try {
      setFormError(null);
      await authService.createUser(data);
      reset();
      // Le decimos a SWR que los datos de '/users' han cambiado y que los vuelva a pedir
      mutate("/users");
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (userId: number) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      try {
        await authService.deleteUser(userId);
        // Igual que al crear, refrescamos los datos
        mutate("/users");
      } catch (err: any) {
        alert(err.message || "Error al eliminar el usuario.");
      }
    }
  };

  if (error) return <div>Error al cargar los usuarios.</div>;
  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Users /> Lista de Usuarios
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users?.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {user.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.id === 1}
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
              <PlusCircle /> Crear Nuevo Usuario
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Nombre Completo"
                {...register("name")}
                error={errors.name?.message}
              />
              <Input
                label="Email"
                type="email"
                {...register("email")}
                error={errors.email?.message}
              />
              <Input
                label="Contraseña"
                type="password"
                {...register("password")}
                error={errors.password?.message}
              />
              <div>
                <label className="text-sm font-medium text-gray-700">Rol</label>
                <select
                  {...register("role")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="empleado">Empleado</option>
                  <option value="director">Director</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creando..." : "Crear Usuario"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Usuarios;
