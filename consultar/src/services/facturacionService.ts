// RUTA: consultar/src/services/facturacionService.ts

import axiosInstance from "../api/axiosInstance";
import apiClient from "../api/axiosInstance";
import { WorkOrder } from "./otService";

export interface Factura {
  id: number;
  numero_factura: string;
  monto: number;
  iva: number;
  vencimiento: string;
  estado: "pendiente" | "pagada" | "vencida" | "archivada";
  cliente_id: number;
  cliente_name: string;
  created_at: string;
  ots?: WorkOrder[];
  cobros?: Cobro[];
  tipo: "A" | "B" | "C" | "E" | "ND" | "NC";
  observaciones: string;
  motivo_archivo?: string;
  moneda: string; // <-- Propiedad añadida
}
export interface Cobro {
  id: number;
  factura_id: number;
  monto: number;
  medio_de_pago: string;
  fecha: string;
  identificacion_cobro?: string;
  ingresos_brutos?: number;
  iva?: number;
  impuesto_ganancias?: number;
  retencion_suss?: number;
}

export interface CreateCobroData {
  monto: number;
  medio_de_pago: string;
  fecha: string;
  identificacion_cobro?: string;
  ingresos_brutos?: number;
  iva?: number;
  impuesto_ganancias?: number;
  retencion_suss?: number;
}

export interface FacturaCreateData {
  numero_factura: string;
  monto?: number;
  vencimiento: string;
  cliente_id: number;
  ot_ids?: number[];
  calculation_type: "manual" | "activities";
  tipo: "A" | "B" | "C" | "E" | "ND" | "NC";
  observaciones?: string;
  moneda: string; // <-- Propiedad añadida
}

// Nuevo tipo para los datos de edición de cobro
export interface CobroUpdateData extends Partial<CreateCobroData> {
  // Aquí no hay campos adicionales, ya que son los mismos que CreateCobroData
}

export interface FacturaUpdateData {
  numero_factura: string;
  monto: number;
  vencimiento: string;
  cliente_id: number;
  tipo: string;
  observaciones?: string; // Hacemos el campo opcional
}

export const facturacionService = {
  getFacturas: async (filters: any): Promise<Factura[]> => {
    const { data } = await apiClient.get("/facturacion", { params: filters });
    return data;
  },

  getFacturaById: async (id: number): Promise<Factura> => {
    const { data } = await apiClient.get(`/facturacion/${id}`);
    return data;
  },

  createFactura: async (
    facturaData: Partial<FacturaCreateData>
  ): Promise<{ id: number }> => {
    const { data } = await apiClient.post("/facturacion", facturaData);
    return data;
  },

  createCobro: async (
    facturaId: number,
    cobroData: CreateCobroData
  ): Promise<Cobro> => {
    const { data } = await apiClient.post(
      `/facturacion/${facturaId}/cobros`,
      cobroData
    );
    return data;
  },

  getFacturasByClienteId: async (clienteId: number): Promise<Factura[]> => {
    const { data } = await apiClient.get(`/facturacion/cliente/${clienteId}`);
    return data;
  },

  // Nuevo método para archivar una factura
  archiveFactura: async (id: number, motivo_archivo: string): Promise<void> => {
    await apiClient.patch(`/facturacion/${id}/archive`, { motivo_archivo });
  },

  // NUEVOS MÉTODOS PARA EDITAR Y ELIMINAR COBROS
  updateCobro: async (
    facturaId: number,
    cobroId: number,
    cobroData: CobroUpdateData
  ): Promise<Cobro> => {
    const { data } = await apiClient.patch(
      `/facturacion/${facturaId}/cobros/${cobroId}`,
      cobroData
    );
    return data;
  },

  deleteCobro: async (facturaId: number, cobroId: number): Promise<void> => {
    await apiClient.delete(`/facturacion/${facturaId}/cobros/${cobroId}`);
  },

  updateFactura: async (id: number, data: Partial<FacturaUpdateData>) => {
    const response = await axiosInstance.patch(`/facturacion/${id}`, data);
    return response.data;
  },

  // --- NUEVAS FUNCIONES AÑADIDAS ---
  unarchiveFactura: async (id: number): Promise<void> => {
    await apiClient.patch(`/facturacion/${id}/unarchive`);
  },

  deleteFactura: async (id: number): Promise<void> => {
    await apiClient.delete(`/facturacion/${id}`);
  },
};
