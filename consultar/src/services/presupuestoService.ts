import axiosInstance from "../api/axiosInstance";

export interface Presupuesto {
  id: number;
  cliente_id: number;
  client_name?: string;
  producto: string;
  tipo_servicio: string;
  norma: string;
  entrega_dias: number;
  precio: number;
  autorizado: boolean;
  created_at: string;
}

export const presupuestoService = {
  getAll: async (filters: any): Promise<Presupuesto[]> => {
    const response = await axiosInstance.get("/presupuestos");
    return response.data;
  },
  getById: async (id: number): Promise<Presupuesto> => {
    const response = await axiosInstance.get(`/presupuestos/${id}`);
    return response.data;
  },
  create: async (
    data: Omit<Presupuesto, "id" | "autorizado" | "created_at">
  ): Promise<{ id: number }> => {
    const response = await axiosInstance.post("/presupuestos", data);
    return response.data;
  },
  authorize: async (id: number): Promise<{ message: string }> => {
    const response = await axiosInstance.put(`/presupuestos/${id}/autorizar`);
    return response.data;
  },
};
