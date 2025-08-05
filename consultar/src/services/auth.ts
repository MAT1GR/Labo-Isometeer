// RUTA: /cliente/src/services/auth.ts

import axiosInstance from "../api/axiosInstance";

export interface User {
  id: number;
  email: string;
  name: string;
  // CORREGIDO: Rol simplificado a "administrador"
  role: "empleado" | "director" | "administracion" | "administrador";
  points: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await axiosInstance.post("/auth/login", credentials);
    return response.data;
  }

  async getAllUsers(): Promise<User[]> {
    const response = await axiosInstance.get("/users");
    return response.data;
  }

  async createUser(
    userData: Omit<User, "id" | "points"> & { password?: string }
  ): Promise<User> {
    const response = await axiosInstance.post("/users", userData);
    return response.data;
  }

  async bulkCreateUsers(
    users: Partial<User>[]
  ): Promise<{ imported: number; duplicates: number }> {
    const response = await axiosInstance.post("/users/bulk-import", {
      users,
    });
    return response.data;
  }

  async deleteUser(userId: number): Promise<void> {
    try {
      await axiosInstance.delete(`/users/${userId}`);
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error("Error al eliminar el usuario.");
    }
  }

  async changePassword(
    userId: number,
    passwords: { currentPassword: string; newPassword: string }
  ): Promise<void> {
    try {
      await axiosInstance.put(`/users/${userId}/password`, passwords);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Error al cambiar la contraseña."
      );
    }
  }
}

export const authService = new AuthService();
