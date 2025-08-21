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
}

// Interfaz para los datos de creación de facturas
export interface FacturaCreateData {
  numero_factura: string;
  monto: number;
  vencimiento: string;
  cliente_id: number;
  ot_ids: number[];
  // Este campo era requerido por tu función pero no estaba en el formulario
  calculation_type: "manual" | "activities";
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

  // Ahora la función usa la interfaz que exportamos
  async createFactura(
    data: Partial<FacturaCreateData>
  ): Promise<{ id: number }> {
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

  async getFacturasByCliente(cliente_id: number): Promise<Factura[]> {
    const response = await axiosInstance.get(
      `/facturacion/cliente/${cliente_id}`
    );
    return response.data;
  }
}

export const facturacionService = new FacturacionService();
