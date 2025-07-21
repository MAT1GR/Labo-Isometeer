// RUTA: /cliente/src/services/auth.ts (CORREGIDO)

import axiosInstance from '../api/axiosInstance';

// --- Interfaces ---
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'empleado' | 'director' | 'administrador';
  created_at?: string; // Hacemos opcional lo que puede no venir siempre
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// --- Clase de Servicio ---
class AuthService {
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const response = await axiosInstance.post('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Error de conexión con el servidor.');
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const response = await axiosInstance.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('No se pudieron cargar los usuarios.');
    }
  }

  async createUser(userData: Omit<User, 'id' | 'created_at'> & { password?: string }): Promise<User> {
    try {
      const response = await axiosInstance.post('/users', userData);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Error al crear el usuario.');
    }
  }

  // --- MÉTODO DELETEUSER MOVIDO AQUÍ DENTRO ---
  async deleteUser(userId: number): Promise<void> {
    try {
      await axiosInstance.delete(`/users/${userId}`);
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Error al eliminar el usuario.');
    }
  }
}

export const authService = new AuthService();