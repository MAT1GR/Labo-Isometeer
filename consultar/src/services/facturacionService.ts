// RUTA: consultar/src/services/facturacionService.ts

import axiosInstance from "../api/axiosInstance";
import { WorkOrder } from "./otService";

export interface Cobro {
  id: number;
  factura_id: number;
  monto: number;
  medio_de_pago: string;
  fecha: string;
  created_at: string;
  // --- CAMPOS NUEVOS OPCIONALES ---
  identificacion_cobro?: string;
  ingresos_brutos?: number;
  iva?: number;
  impuesto_ganancias?: number;
  retencion_suss?: number;
}

export interface Factura {
  id: number;
  numero_factura: string;
  monto: number;
  iva?: number;
  vencimiento: string;
  estado: "pendiente" | "pagada" | "vencida";
  cliente_id?: number;
  created_at: string;
  cliente_name?: string;
  pagado: number;
  ots_asociadas?: string;
  cobros?: Cobro[];
  ots?: WorkOrder[];
  calculation_type?: "manual" | "activities";
}

export interface FacturaCreateData {
  numero_factura: string;
  monto?: number;
  vencimiento: string;
  cliente_id: number;
  ot_ids: number[];
  calculation_type: "manual" | "activities";
}

// --- INTERFAZ PARA LOS DATOS DE UN NUEVO COBRO ---
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

class FacturacionService {
  async getFacturas(filters: any = {}): Promise<Factura[]> {
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        queryParams.append(key, filters[key]);
      }
    });
    const queryString = queryParams.toString();

    const response = await axiosInstance.get(`/facturacion?${queryString}`);
    return response.data;
  }

  async getFacturaById(id: number): Promise<Factura> {
    const response = await axiosInstance.get(`/facturacion/${id}`);
    return response.data;
  }

  async createFactura(
    data: Partial<FacturaCreateData>
  ): Promise<{ id: number }> {
    const response = await axiosInstance.post("/facturacion", data);
    return response.data;
  }

  // --- MÉTODO ACTUALIZADO PARA USAR LA NUEVA INTERFAZ ---
  async createCobro(facturaId: number, data: CreateCobroData): Promise<Cobro> {
    const response = await axiosInstance.post(
      `/facturacion/${facturaId}/cobros`,
      data
    );
    return response.data;
  }

  async getFacturasByCliente(cliente_id: number): Promise<Factura[]> {
    const response = await axiosInstance.get(
      `/facturacion/cliente/${cliente_id}`
    );
    return response.data;
  }
}

export const facturacionService = new FacturacionService();
