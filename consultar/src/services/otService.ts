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
    // CORREGIDO: La ruta ahora es '/ots' en lugar de '/work_orders'
    const { data } = await apiClient.get("/ots", { params: filters });
    return data;
  },

  getOTById: async (id: number): Promise<WorkOrder> => {
    // CORREGIDO: La ruta ahora es '/ots/:id'
    const { data } = await apiClient.get(`/ots/${id}`);
    return data;
  },

  createOT: async (
    otData: WorkOrderCreateData
  ): Promise<{ id: number; custom_id: string }> => {
    // CORREGIDO: La ruta ahora es '/ots'
    const { data } = await apiClient.post("/ots", otData);
    return data;
  },

  updateOT: async (
    id: number,
    otData: Partial<WorkOrder>
  ): Promise<WorkOrder> => {
    // CORREGIDO: La ruta ahora es '/ots/:id'
    const { data } = await apiClient.patch(`/ots/${id}`, otData);
    return data;
  },

  getOTsByClientId: async (clientId: number): Promise<WorkOrder[]> => {
    const { data } = await apiClient.get(`/clients/${clientId}/ots`);
    return data;
  },
};
