// RUTA: consultar/src/services/otService.ts

import axiosInstance from "../api/axiosInstance";
import { User } from "./auth";

// Interfaces
export interface Activity {
  id: number;
  ot_id: number;
  description: string;
  materials: string;
  user_id: number;
  user_name?: string;
  hours_spent: number;
  created_at: string;
}

export interface WorkOrder {
  id: number;
  client_id: number;
  client_name?: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  custom_id?: string;
  title: string;
  description: string;
  status: "pendiente" | "en_progreso" | "finalizada" | "facturada" | "cerrada";
  priority: "baja" | "media" | "alta";
  assigned_to: number | null;
  assigned_to_name?: string;
  authorized: boolean;
  authorized_by?: number | null;
  authorized_by_name?: string;
  authorization_date?: string | null;
  activities: Activity[];
  completion_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface OTFilters {
  client_id?: number;
  status?: string;
  assigned_to?: number;
  authorized?: boolean;
  start_date?: string;
  end_date?: string;
}

// Funciones del Servicio

const getAllOTs = async (
  user: User | null,
  filters: OTFilters = {}
): Promise<WorkOrder[]> => {
  if (!user) return [];
  try {
    const params = new URLSearchParams();

    if (filters.client_id)
      params.append("clientId", filters.client_id.toString());
    if (filters.status) params.append("status", filters.status);
    if (filters.assigned_to)
      params.append("assignedTo", filters.assigned_to.toString());
    if (filters.authorized !== undefined)
      params.append("authorized", filters.authorized.toString());
    if (filters.start_date) params.append("startDate", filters.start_date);
    if (filters.end_date) params.append("endDate", filters.end_date);

    const response = await axiosInstance.get("/ots", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching work orders:", error);
    throw error;
  }
};

const getOTById = async (id: number): Promise<WorkOrder> => {
  const response = await axiosInstance.get(`/ots/${id}`);
  return response.data;
};

const createOT = async (
  otData: Omit<WorkOrder, "id" | "created_at" | "updated_at" | "activities">
): Promise<WorkOrder> => {
  const response = await axiosInstance.post("/ots", otData);
  return response.data;
};

const updateOT = async (
  id: number,
  otData: Partial<WorkOrder>
): Promise<WorkOrder> => {
  const response = await axiosInstance.put(`/ots/${id}`, otData);
  return response.data;
};

const deleteOT = async (id: number): Promise<void> => {
  await axiosInstance.delete(`/ots/${id}`);
};

const authorizeOT = async (id: number, userId: number): Promise<WorkOrder> => {
  // ✅ Solución: Cambiado de POST a PUT
  const response = await axiosInstance.put(`/ots/${id}/authorize`, { userId });
  return response.data;
};

const deauthorizeOT = async (id: number): Promise<WorkOrder> => {
  // ✅ Solución: Cambiado de POST a PUT
  const response = await axiosInstance.put(`/ots/${id}/deauthorize`);
  return response.data;
};

const addActivityToOT = async (
  activityData: Omit<Activity, "id" | "created_at" | "user_name">
): Promise<Activity> => {
  const response = await axiosInstance.post(
    `/ots/${activityData.ot_id}/activities`,
    activityData
  );
  return response.data;
};

const deleteActivity = async (
  otId: number,
  activityId: number
): Promise<void> => {
  await axiosInstance.delete(`/ots/${otId}/activities/${activityId}`);
};

// Objeto de servicio exportado
export const otService = {
  getAllOTs,
  getOTById,
  createOT,
  updateOT,
  addActivityToOT,
  deleteActivity,
  deleteOT,
  authorizeOT,
  deauthorizeOT,
};
