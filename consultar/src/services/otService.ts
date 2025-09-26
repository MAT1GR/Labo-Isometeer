// RUTA: consultar/src/services/otService.ts

import { ReactNode } from "react";
import axiosInstance from "../api/axiosInstance";
import { User } from "./auth";

// Interfaces
export interface Activity {
  name: ReactNode;
  precio_sin_iva: number;
  assigned_users: any;
  activity: any;
  status: string;
  started_at: string | null;
  completed_at: string | null;
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
  product: ReactNode;
  facturada: any;
  moneda: string;
  client: any;
  date: any;
  certificate_expiry: any;
  estimated_delivery_date: any;
  contact_id: any;
  facturas: boolean;
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
  searchTerm?: string;
  clientId?: number;
  assignedToId?: number;
  status?: string;
  authorized?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface UserSummaryItem {
  id: number;
  custom_id: string;
  product: string;
  client_name: string;
  ot_date: string;
  activity: string;
  status: "pendiente" | "en_progreso" | "finalizada";
}

// --- Funciones del Servicio ---

const getAllOTs = async (
  user: User | null,
  filters: OTFilters = {}
): Promise<WorkOrder[]> => {
  if (!user) return [];
  try {
    const params = new URLSearchParams();
    if (user.role) params.append("role", user.role);
    if (user.id) params.append("user_id", user.id.toString());

    // --- Nombres de parámetros corregidos para coincidir con el backend ---
    if (filters.searchTerm) params.append("searchTerm", filters.searchTerm);
    if (filters.clientId)
      params.append("clientId", filters.clientId.toString());
    if (filters.status) params.append("status", filters.status);
    if (filters.assignedToId)
      params.append("assignedToId", filters.assignedToId.toString());
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

export const getMisOts = async (userId: number) => {
  try {
    if (!userId) {
      return [];
    }
    const response = await axiosInstance.get(`/ots/asignadas/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching assigned work orders:", error);
    throw error;
  }
};

// [GET] /api/ots/history/:id
export const getOtHistory = async (id: string) => {
  try {
    const response = await axiosInstance.get(`/ots/history/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching OT history:", error);
    throw error;
  }
};

const getOTById = async (id: number): Promise<WorkOrder> => {
  const response = await axiosInstance.get(`/ots/${id}`);
  return response.data;
};

const getOTsByClientId = async (clientId: number): Promise<WorkOrder[]> => {
  const response = await axiosInstance.get(`/ots/cliente/${clientId}`);
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
  const response = await axiosInstance.put(`/ots/${id}/authorize`, { userId });
  return response.data;
};

const deauthorizeOT = async (
  id: number,
  userId?: number
): Promise<WorkOrder> => {
  const response = await axiosInstance.put(`/ots/${id}/deauthorize`, {
    userId,
  });
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

const getUserSummary = async (userId: number): Promise<UserSummaryItem[]> => {
  const response = await axiosInstance.get(`/ots/user-summary/${userId}`);
  return response.data;
};

// --- NUEVAS FUNCIONES PARA INICIAR Y DETENER ACTIVIDADES ---
const startActivity = async (
  activityId: number,
  userId: number
): Promise<void> => {
  await axiosInstance.put(`/ots/activities/${activityId}/start`, { userId });
};

const stopActivity = async (
  activityId: number,
  userId: number
): Promise<void> => {
  await axiosInstance.put(`/ots/activities/${activityId}/stop`, { userId });
};

// --- Objeto de servicio exportado (AHORA CON LAS NUEVAS FUNCIONES) ---
export const otService = {
  getAllOTs,
  getMisOts,
  getOTById,
  createOT,
  updateOT,
  addActivityToOT,
  deleteActivity,
  deleteOT,
  authorizeOT,
  deauthorizeOT,
  getOtHistory,
  getUserSummary,
  startActivity,
  stopActivity,
  getOTsByClientId,
};
