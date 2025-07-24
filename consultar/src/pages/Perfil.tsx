// RUTA: /cliente/src/pages/Perfil.tsx

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authService } from "../services/auth";
import { ShieldCheck, UserCircle } from "lucide-react";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "La contraseña actual es requerida."),
    newPassword: z
      .string()
      .min(6, "La nueva contraseña debe tener al menos 6 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las nuevas contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

const Perfil: React.FC = () => {
  const { user } = useAuth();
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormData) => {
    if (!user) return;
    setSuccessMessage("");
    setErrorMessage("");
    try {
      await authService.changePassword(user.id, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccessMessage("¡Contraseña actualizada con éxito!");
      reset();
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  };

  if (!user) {
    return <div>Cargando perfil...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mi Perfil</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <UserCircle /> Información
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Nombre
              </p>
              <p>{user.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Email
              </p>
              <p>{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Rol
              </p>
              <p className="capitalize">{user.role}</p>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <ShieldCheck /> Cambiar Contraseña
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Contraseña Actual"
              type="password"
              {...register("currentPassword")}
              error={errors.currentPassword?.message}
            />
            <Input
              label="Nueva Contraseña"
              type="password"
              {...register("newPassword")}
              error={errors.newPassword?.message}
            />
            <Input
              label="Confirmar Nueva Contraseña"
              type="password"
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
            />
            {successMessage && (
              <p className="text-sm text-green-600 dark:text-green-400">
                {successMessage}
              </p>
            )}
            {errorMessage && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            )}
            <div className="text-right">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Actualizando..." : "Actualizar Contraseña"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Perfil;
