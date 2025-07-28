// RUTA: /cliente/src/pages/Login.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { LogIn, FlaskConical } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Ingresa un email válido").default(""),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .default(""),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-32 rounded-full flex items-center justify-center mb-4">
            <img
              className="h-auto w-auto"
              src="public/logo.png"
              alt="Logo de la Empresa"
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
            ISOmeter Go
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sistema de Gestión Interno
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg shadow-md p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="tu@laboratorio.com"
                error={errors.email?.message}
                {...register("email")}
              />
              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register("password")}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-sm text-red-800 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              <LogIn className="mr-2 h-5 w-5" />
              {isLoading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>
                <strong>Demo:</strong>
              </p>
              <p>Admin: admin@laboratorio.com / admin123</p>
              <p>Director: director@laboratorio.com / admin123</p>
              <p>Empleado: empleado@laboratorio.com / admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
