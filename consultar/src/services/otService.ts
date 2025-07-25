// RUTA: /cliente/src/services/otService.ts

import axiosInstance from "../api/axiosInstance";
import { User } from "./auth";

export interface WorkOrder {
  id: number;
  custom_id?: string;
  date: string;
  type: string;
  client_id: number;
  contract?: string;
  product: string;
  brand?: string;
  model?: string;
  seal_number?: string;
  observations?: string;
  collaborator_observations?: string;
  certificate_expiry?: string;
  status: string;
  created_by: number;
  assigned_to?: number | null;
  quotation_amount?: number;
  quotation_details?: string;
  disposition?: string;
  authorized: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  duration_minutes?: number | null;
  created_at: string;
  updated_at?: string;
  // Campos que vienen de JOINS
  client_name?: string;
  client_code?: string;
  assigned_to_name?: string;
}

// Interfaz para los datos específicos del gráfico
export interface TimelineOt {
  id: number;
  custom_id?: string;
  product: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  duration_minutes?: number | null;
}

class OTService {
  async getAllOTs(user: User | null): Promise<WorkOrder[]> {
    if (!user) return [];
    const response = await axiosInstance.get("/ots", {
      params: { role: user.role, assigned_to: user.id },
    });
    return response.data;
  }

  async getTimelineData(params: {
    year: number;
    month: number;
    assigned_to: number;
  }): Promise<TimelineOt[]> {
    const response = await axiosInstance.get("/ots/timeline", { params });
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
  async authorizeOT(id: number): Promise<WorkOrder> {
    const response = await axiosInstance.put(`/ots/${id}/authorize`);
    return response.data;
  }
  async deauthorizeOT(id: number): Promise<void> {
    await axiosInstance.put(`/ots/${id}/deauthorize`);
  }
  async startOT(id: number): Promise<WorkOrder> {
    const response = await axiosInstance.put(`/ots/${id}/start`);
    return response.data;
  }
  async stopOT(id: number): Promise<WorkOrder> {
    const response = await axiosInstance.put(`/ots/${id}/stop`);
    return response.data;
  }
}

export const otService = new OTService();
