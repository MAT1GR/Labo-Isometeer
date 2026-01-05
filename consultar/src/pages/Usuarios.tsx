// RUTA: /cliente/src/pages/Usuarios.tsx

import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authService, User } from "../services/auth";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { PlusCircle, Users, Trash2, BarChart2, Upload } from "lucide-react";
import useSWR, { mutate } from "swr";
import { fetcher } from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import ConfirmationModal from "../components/ui/ConfirmationModal"; // Importamos el modal
import * as XLSX from "xlsx";

const userSchema = z.object({
  name: z.string().min(3, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["empleado", "director", "administracion", "administrador"]),
});

type UserFormData = z.infer<typeof userSchema>;

const Usuarios: React.FC = () => {
  const { data: users, error, isLoading } = useSWR<User[]>("/users", fetcher);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para el modal de confirmación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

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
      mutate("/users");
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteRequest = (userId: number) => {
    setUserToDelete(userId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setUserToDelete(null);
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (userToDelete === null) return;
    try {
      await authService.deleteUser(userToDelete);
      mutate("/users");
    } catch (err: any) {
      alert(err.message || "Error al eliminar el usuario.");
    } finally {
      handleCloseModal();
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const usersToImport = json.map((row) => ({
          name: row["nombre"] || row["Nombre"],
          email: row["email"] || row["Email"],
          password:
            row["password"] ||
            row["Password"] ||
            row["contraseña"] ||
            row["Contraseña"],
          role: row["rol"] || row["Rol"],
        }));

        if (usersToImport.length > 0) {
          const response = await authService.bulkCreateUsers(usersToImport);
          alert(
            `Importación completada: ${response.imported} usuarios nuevos, ${response.duplicates} duplicados ignorados.`
          );
          mutate("/users");
        }
      } catch (error) {
        alert(
          "Hubo un error al procesar el archivo. Asegúrate que las columnas son: nombre, email, password, role."
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (error) return <div>Error al cargar los usuarios.</div>;
  if (isLoading) return <div>Cargando...</div>;

  return (
    <>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="Eliminar Usuario"
        message="¿Estás seguro de que quieres eliminar este usuario? Si tiene OTs asignadas, no podrá ser eliminado. Esta acción no se puede deshacer."
      />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" /> Importar Usuarios
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              className="hidden"
              accept=".xlsx, .xls"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Users /> Lista de Usuarios
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Puntos
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {users?.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 font-medium">{user.name}</td>
                        <td className="px-6 py-4">{user.email}</td>
                        <td className="px-6 py-4 capitalize">{user.role}</td>
                        <td className="px-6 py-4 font-semibold text-blue-600 dark:text-blue-400">
                          {user.points}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteRequest(user.id)}
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
                  <label className="text-sm font-medium">Rol</label>
                  <select
                    {...register("role")}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 px-3 py-2 mt-2"
                  >
                    <option value="empleado">Empleado</option>
                    <option value="director">Director</option>
                    <option value="administracion">Administración</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
                {formError && (
                  <p className="text-sm text-red-600">{formError}</p>
                )}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Creando..." : "Crear Usuario"}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default Usuarios;
