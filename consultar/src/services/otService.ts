// RUTA: /cliente/src/services/otService.ts

import axiosInstance from "../api/axiosInstance";
import { User } from "./auth";
import { Client } from "./clientService"; // Importamos la interfaz del cliente

export interface Activity {
  id: number;
  activity: string;
  norma?: string;
  precio_sin_iva?: number;
  assigned_to: number[]; // Array de IDs de usuario
  assigned_users?: { id: number; name: string }[]; // Array de objetos de usuario
  status: "pendiente" | "en_progreso" | "finalizada";
  started_at?: string;
  completed_at?: string;
}

export interface WorkOrder {
  client_name: string | number | readonly string[] | undefined;
  completed_at: any;
  id: number;
  custom_id?: string;
  date: string;
  type: string;
  client_id: number;
  client?: Client; // Objeto de cliente completo
  activities?: Activity[];
  product: string;
  brand?: string;
  model?: string;
  seal_number?: string;
  observations?: string;
  collaborator_observations?: string;
  certificate_expiry?: string;
  status: string;
  created_by: number;
  quotation_amount?: number;
  quotation_details?: string;
  disposition?: string;
  authorized: boolean;
  contract_type?: string;
  created_at: string;
  updated_at?: string;
  assigned_to_name?: string;
}

// Interfaz para los filtros
export interface OTFilters {
  [key: string]: any;
}

// Interfaz para el nuevo resumen de empleado
export interface UserSummaryItem {
  id: number;
  custom_id: string;
  product: string;
  client_name: string;
  ot_date: string;
  activity: string;
  status: "pendiente" | "en_progreso" | "finalizada";
}

class OTService {
  // Modificamos la función para que acepte filtros
  async getAllOTs(
    user: User | null,
    filters: OTFilters = {}
  ): Promise<WorkOrder[]> {
    if (!user) return [];

    // Construimos los parámetros de la consulta
    const params = new URLSearchParams({
      role: user.role,
      assigned_to: String(user.id),
    });

    // Añadimos los filtros a los parámetros, ignorando los vacíos
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, String(value));
      }
    });

    const response = await axiosInstance.get("/ots", { params });
    return response.data;
  }

  async getOTById(id: number): Promise<WorkOrder> {
    const response = await axiosInstance.get(`/ots/${id}`);
    return response.data;
  }
  async createOT(otData: Partial<WorkOrder>): Promise<{ id: number }> {
    const response = await axiosInstance.post("/ots", otData);
    return response.data;
  }
  async updateOT(id: number, otData: Partial<WorkOrder>): Promise<WorkOrder> {
    const response = await axiosInstance.put(`/ots/${id}`, otData);
    return response.data;
  }
  async deleteOT(otId: number): Promise<void> {
    await axiosInstance.delete(`/ots/${otId}`);
  }

  async authorizeOT(id: number, userId: number): Promise<WorkOrder> {
    const response = await axiosInstance.put(`/ots/${id}/authorize`, {
      userId,
    });
    return response.data;
  }

  async deauthorizeOT(id: number): Promise<void> {
    await axiosInstance.put(`/ots/${id}/deauthorize`);
  }

  async startActivity(activityId: number): Promise<void> {
    await axiosInstance.put(`/ots/activities/${activityId}/start`);
  }

  async stopActivity(activityId: number): Promise<void> {
    await axiosInstance.put(`/ots/activities/${activityId}/stop`);
  }

  async getUserSummary(userId: number): Promise<UserSummaryItem[]> {
    const response = await axiosInstance.get(`/ots/user-summary/${userId}`);
    return response.data;
  }
}

export const otService = new OTService();
