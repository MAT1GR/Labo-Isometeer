// RUTA: /cliente/src/services/otService.ts

import axiosInstance from '../api/axiosInstance';

export interface WorkOrder {
  id: number;
  date: string;
  type: string;
  client_id: number;
  client_name?: string;
  contract?: string;
  product: string;
  status: string;
  created_by: number;
  created_at: string;
}

class OTService {
  async getAllOTs(): Promise<WorkOrder[]> {
    try {
      const response = await axiosInstance.get('/ots');
      return response.data;
    } catch (error) {
      console.error('Error fetching OTs:', error);
      throw new Error('No se pudieron cargar las órdenes de trabajo.');
    }
  }

  async createOT(otData: Omit<WorkOrder, 'id' | 'created_at' | 'status' | 'client_name'>): Promise<WorkOrder> {
    try {
      const response = await axiosInstance.post('/ots', otData);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Error al crear la orden de trabajo.');
    }
  }

  async deleteOT(otId: number): Promise<void> {
    try {
        await axiosInstance.delete(`/ots/${otId}`);
    } catch (error: any) {
        if (error.response && error.response.data && error.response.data.error) {
            throw new Error(error.response.data.error);
        }
        throw new Error('Error al eliminar la OT.');
    }
  }
}

export const otService = new OTService();