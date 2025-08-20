import axiosInstance from "../api/axiosInstance";
import { Client } from "./clientService";

export interface Activity {
  id?: number;
  work_order_id: number;
  activity: string;
  norma?: string;
  precio_sin_iva?: number;
  status: "pendiente" | "en_progreso" | "finalizada";
  assigned_users?: { id: number; name: string }[];
}

export interface WorkOrder {
  id: number;
  custom_id: string;
  date: string;
  type: string;
  client_id: number;
  contact_id?: number;
  product: string;
  brand?: string;
  model?: string;
  seal_number?: string;
  observations?: string;
  certificate_expiry?: string;
  estimated_delivery_date?: string;
  collaborator_observations?: string;
  status: "pendiente" | "en_progreso" | "finalizada" | "cancelada";
  created_by: number;
  quotation_amount?: number;
  quotation_details?: string;
  disposition?: string;
  authorized: boolean;
  contract_type: string;
  activities?: Activity[];
  client?: Client;
  facturada?: boolean;
}

class OTService {
  async getOTs(filters?: {
    status?: string;
    type?: string;
    cliente_id?: string;
    user_id?: string;
    facturada?: string;
  }): Promise<WorkOrder[]> {
    const response = await axiosInstance.get("/ots", { params: filters });
    // CORRECCIÓN: Se debe devolver explícitamente la data de la respuesta.
    return response.data;
  }

  async getOTById(id: number): Promise<WorkOrder> {
    const response = await axiosInstance.get(`/ots/${id}`);
    return response.data;
  }

  async createOT(data: Partial<WorkOrder>): Promise<WorkOrder> {
    const response = await axiosInstance.post("/ots", data);
    return response.data;
  }

  async updateOT(id: number, data: Partial<WorkOrder>): Promise<WorkOrder> {
    const response = await axiosInstance.put(`/ots/${id}`, data);
    return response.data;
  }

  async deleteOT(id: number): Promise<void> {
    await axiosInstance.delete(`/ots/${id}`);
  }

  async addActivity(
    otId: number,
    activityData: Omit<Activity, "id" | "work_order_id">
  ): Promise<Activity> {
    const response = await axiosInstance.post(
      `/ots/${otId}/activities`,
      activityData
    );
    return response.data;
  }

  async updateActivity(
    activityId: number,
    activityData: Partial<Activity>
  ): Promise<Activity> {
    const response = await axiosInstance.put(
      `/ots/activities/${activityId}`,
      activityData
    );
    return response.data;
  }

  async deleteActivity(activityId: number): Promise<void> {
    await axiosInstance.delete(`/ots/activities/${activityId}`);
  }

  async assignUserToActivity(
    activityId: number,
    userId: number
  ): Promise<void> {
    await axiosInstance.post(`/ots/activities/${activityId}/assign`, {
      userId,
    });
  }

  async unassignUserFromActivity(
    activityId: number,
    userId: number
  ): Promise<void> {
    await axiosInstance.delete(
      `/ots/activities/${activityId}/assign/${userId}`
    );
  }

  async authorizeOT(id: number): Promise<WorkOrder> {
    const response = await axiosInstance.post(`/ots/${id}/authorize`);
    return response.data;
  }
}

export const otService = new OTService();
