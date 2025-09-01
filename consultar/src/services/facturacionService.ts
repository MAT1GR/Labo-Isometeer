// RUTA: consultar/src/services/facturacionService.ts

import apiClient from "../api/axiosInstance";
import { WorkOrder } from "./otService";

export interface Factura {
  id: number;
  numero_factura: string;
  monto: number;
  iva: number;
  vencimiento: string;
  estado: "pendiente" | "pagada" | "vencida";
  cliente_id: number;
  cliente_name: string;
  created_at: string;
  ots?: WorkOrder[];
  cobros?: Cobro[];
  tipo: "A" | "B" | "C" | "E" | "ND" | "NC";
  observaciones: string;
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
};
