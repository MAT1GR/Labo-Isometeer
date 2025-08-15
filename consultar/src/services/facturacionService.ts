// RUTA: /consultar/src/services/facturacionService.ts
import axiosInstance from "../api/axiosInstance";
import { WorkOrder } from "./otService";

export interface Cobro {
  id: number;
  factura_id: number;
  monto: number;
  medio_de_pago: string;
  fecha: string;
  created_at: string;
}

export interface Factura {
  id: number;
  numero_factura: string;
  monto: number;
  vencimiento: string;
  estado: "pendiente" | "pagada" | "vencida";
  cliente_id?: number;
  created_at: string;
  cliente_name?: string;
  pagado: number;
  ots_asociadas?: string;
  cobros?: Cobro[];
  ots?: WorkOrder[];
}

class FacturacionService {
  async getFacturas(): Promise<Factura[]> {
    const response = await axiosInstance.get("/facturacion");
    return response.data;
  }

  async getFacturaById(id: number): Promise<Factura> {
    const response = await axiosInstance.get(`/facturacion/${id}`);
    return response.data;
  }

  async createFactura(data: {
    numero_factura: string;
    monto: number;
    vencimiento: string;
    cliente_id: number;
    ot_ids?: number[];
  }): Promise<{ id: number }> {
    const response = await axiosInstance.post("/facturacion", data);
    return response.data;
  }

  async createCobro(
    facturaId: number,
    data: { monto: number; medio_de_pago: string; fecha: string }
  ): Promise<Cobro> {
    const response = await axiosInstance.post(
      `/facturacion/${facturaId}/cobros`,
      data
    );
    return response.data;
  }
}

export const facturacionService = new FacturacionService();
