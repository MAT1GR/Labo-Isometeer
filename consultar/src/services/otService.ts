// RUTA: /cliente/src/services/otService.ts

import axiosInstance from "../api/axiosInstance";
import { User } from "./auth";

export interface Activity {
  id: number;
  activity: string;
  assigned_to: number | null;
  assigned_to_name?: string;
  status: "pendiente" | "en_progreso" | "finalizada";
  started_at?: string;
  completed_at?: string;
}

export interface WorkOrder {
  completed_at: any;
  id: number;
  custom_id?: string;
  date: string;
  type: string;
  client_id: number;
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
  contract_type?: string; // NUEVO CAMPO
  created_at: string;
  updated_at?: string;
  client_name?: string;
  client_code?: string;
  assigned_to_name?: string;
}

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
}

export const otService = new OTService();
