// RUTA: /cliente/src/services/otService.ts

import axiosInstance from "../api/axiosInstance";
import { Client } from "./clientService";
import { User } from "./auth";
import { ReactNode } from "react";

export interface Activity {
  name: ReactNode;
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
  status:
    | "pendiente"
    | "en_progreso"
    | "finalizada"
    | "cancelada"
    | "facturada"
    | "cerrada";
  created_by: number;
  quotation_amount?: number;
  quotation_details?: string;
  disposition?: string;
  authorized: boolean;
  contract_type: string;
  activities?: Activity[];
  client?: Client;
  facturada?: boolean;
  // Estos campos son útiles para mostrar información en la tabla de OTs
  client_name?: string;
  assigned_to_name?: string;
}

export interface OTFilters {
  searchTerm?: string;
  clientId?: number;
  assignedToId?: number;
  status?: string;
  authorized?: boolean;
}

class OTService {
  getOTs(arg0: { cliente_id: any; facturada: string }) {
    throw new Error("Method not implemented.");
  }
  /**
   * Obtiene las OTs del servidor.
   * La lógica de qué OTs devolver se maneja en el backend según el rol del usuario.
   */
  async getAllOTs(user: User | null, filters: OTFilters): Promise<WorkOrder[]> {
    if (!user) {
      return []; // No se pueden obtener OTs si no hay un usuario logueado.
    }

    const params: any = { ...filters };

    // Si el usuario es un empleado, se envían sus datos para que el backend filtre las OTs.
    if (user.role === "empleado") {
      params.role = user.role;
      params.assigned_to = user.id;
    }

    const response = await axiosInstance.get("/ots", { params });
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

  async getOTsByClientId(clientId: number): Promise<WorkOrder[]> {
    const response = await axiosInstance.get(`/ots/cliente/${clientId}`);
    return response.data;
  }

  /**
   * Autoriza una Orden de Trabajo.
   * Se corrigió para usar PUT y enviar el ID del usuario que autoriza.
   */
  async authorizeOT(id: number, userId: number): Promise<WorkOrder> {
    const response = await axiosInstance.put(`/ots/${id}/authorize`, {
      userId,
    });
    return response.data;
  }

  /**
   * Desautoriza una Orden de Trabajo.
   */
  async deauthorizeOT(id: number): Promise<void> {
    await axiosInstance.put(`/ots/${id}/deauthorize`);
  }
}

export const otService = new OTService();
