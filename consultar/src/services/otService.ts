// RUTA: /cliente/src/services/otService.ts

import axiosInstance from "../api/axiosInstance";

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
  certificate_expiry?: string;
  status: string;
  created_by: number;
  assigned_to?: number | null;
  quotation_amount?: number;
  quotation_details?: string;
  disposition?: string;
  created_at: string;
  updated_at?: string;
  // Campos que vienen de JOINS
  client_name?: string;
  client_code?: string;
  client_contact?: string;
  assigned_to_name?: string;
}

class OTService {
  async getAllOTs(): Promise<WorkOrder[]> {
    try {
      const response = await axiosInstance.get("/ots");
      return response.data;
    } catch (error) {
      throw new Error("No se pudieron cargar las órdenes de trabajo.");
    }
  }

  async getMyOTs(userId: number): Promise<WorkOrder[]> {
    try {
      const response = await axiosInstance.get(`/ots?assigned_to=${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        "No se pudieron cargar tus órdenes de trabajo asignadas."
      );
    }
  }

  async getOTById(id: number): Promise<WorkOrder> {
    try {
      const response = await axiosInstance.get(`/ots/${id}`);
      return response.data;
    } catch (error) {
      throw new Error("No se pudo cargar la orden de trabajo.");
    }
  }

  async createOT(otData: Partial<WorkOrder>): Promise<{ id: number }> {
    try {
      const response = await axiosInstance.post("/ots", otData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || "Error al crear la OT.");
    }
  }

  async updateOT(id: number, otData: Partial<WorkOrder>): Promise<WorkOrder> {
    try {
      const response = await axiosInstance.put(`/ots/${id}`, otData);
      return response.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Error al actualizar la OT."
      );
    }
  }

  async deleteOT(otId: number): Promise<void> {
    try {
      await axiosInstance.delete(`/ots/${otId}`);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.error || "Error al eliminar la OT."
      );
    }
  }
}

export const otService = new OTService();
