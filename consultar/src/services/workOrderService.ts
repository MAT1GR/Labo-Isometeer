// RUTA: /consultar/src/services/workOrderService.ts
import axiosInstance from "../api/axiosInstance";

export interface WorkOrder {
  id: number;
  custom_id: string;
  title: string; // Mantenemos 'title' porque en el backend le pusimos un alias
  client_id: number;
  client_name: string;
  status: string;
  created_at: string;
}

interface GetWorkOrdersParams {
  clientId?: number;
}

class WorkOrderService {
  async getWorkOrders(params: GetWorkOrdersParams = {}): Promise<WorkOrder[]> {
    // --- CAMBIO CLAVE AQUÍ ---
    const response = await axiosInstance.get("/ots", { params });
    return response.data;
  }

  async getWorkOrderById(id: number): Promise<WorkOrder> {
    // --- Y AQUÍ ---
    const response = await axiosInstance.get(`/ots/${id}`);
    return response.data;
  }
}

export const workOrderService = new WorkOrderService();
