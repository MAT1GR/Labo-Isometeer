// RUTA: consultar/src/services/otService.ts

import apiClient from "../api/axiosInstance";
import { User } from "./auth";

export interface Activity {
  id: number;
  work_order_id: number;
  activity: string;
  norma?: string;
  precio_sin_iva?: number;
  status: "pendiente" | "en_progreso" | "finalizada";
  started_at?: string;
  completed_at?: string;
  assigned_users?: User[]; //  usuarios asignados
  assigned_users_names?: string;
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
  collaborator_observations?: string;
  certificate_expiry?: string;
  estimated_delivery_date?: string;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  client_name?: string;
  contact_name?: string;
  creator_name?: string;
  activities: Activity[];
  facturada?: boolean;
  disposition?: string;
  authorized: boolean;
  contract_type?: string;
  moneda: "ARS" | "USD";
}

export interface WorkOrderCreateData {
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
  created_by: number;
  activities: {
    activity: string;
    norma?: string;
    precio_sin_iva?: number;
  }[];
  disposition?: string;
  authorized: boolean;
  contract_type: string;
  moneda: "ARS" | "USD";
}

export const otService = {
  getAllOTs: async (filters: any): Promise<WorkOrder[]> => {
    const { data } = await apiClient.get("/work_orders", { params: filters });
    return data;
  },

  getOTById: async (id: number): Promise<WorkOrder> => {
    const { data } = await apiClient.get(`/work_orders/${id}`);
    return data;
  },

  createOT: async (
    otData: WorkOrderCreateData
  ): Promise<{ id: number; custom_id: string }> => {
    const { data } = await apiClient.post("/work_orders", otData);
    return data;
  },

  updateOT: async (
    id: number,
    otData: Partial<WorkOrder>
  ): Promise<WorkOrder> => {
    const { data } = await apiClient.patch(`/work_orders/${id}`, otData);
    return data;
  },

  getOTsByClientId: async (clientId: number): Promise<WorkOrder[]> => {
    const { data } = await apiClient.get(`/clients/${clientId}/ots`);
    return data;
  },
};
