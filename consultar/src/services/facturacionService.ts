// RUTA: /consultar/src/services/facturacionService.ts

import axiosInstance  from "../api/axiosInstance";
import { WorkOrder } from "./otService";

export interface Factura {
  pagado(pagado: any): number | null | undefined;
  id: number;
  numero_factura: string;
  monto: string; // El backend espera el monto como string
  fecha_emision: string;
  vencimiento: string;
  estado: "pendiente" | "pagada" | "vencida";
  cliente_id: number;
  cliente_nombre: string;
  cliente_codigo: string;
  ots: WorkOrder[];
}

export interface FacturaInput {
  numero_factura: string;
  monto: number; // El formulario lo maneja como número, lo cual es correcto
  vencimiento: string;
  cliente_id: number;
  ot_ids?: number[];
}

const getFacturas = async (): Promise<Factura[]> => {
  try {
    const response = await axiosInstance.get<Factura[]>("/facturacion");
    return response.data;
  } catch (error) {
    console.error("Error al obtener las facturas:", error);
    throw error;
  }
};

const getFacturaById = async (id: number): Promise<Factura> => {
  try {
    const response = await axiosInstance.get<Factura>(`/facturacion/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener la factura ${id}:`, error);
    throw error;
  }
};

const createFactura = async (facturaData: FacturaInput): Promise<Factura> => {
  try {
    // CORRECCIÓN: Convertir el monto a string antes de enviar
    const dataToSend = {
      ...facturaData,
      monto: String(facturaData.monto),
    };

    const response = await axiosInstance.post<Factura>(
      "/facturacion",
      dataToSend
    );
    return response.data;
  } catch (error) {
    console.error("Error al crear la factura:", error);
    throw error;
  }
};

const updateFactura = async (
  id: number,
  facturaData: Partial<FacturaInput>
): Promise<Factura> => {
  try {
    const response = await axiosInstance.put<Factura>(
      `/facturacion/${id}`,
      facturaData
    );
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar la factura ${id}:`, error);
    throw error;
  }
};

const deleteFactura = async (id: number): Promise<void> => {
  try {
    await axiosInstance.delete(`/facturacion/${id}`);
  } catch (error) {
    console.error(`Error al eliminar la factura ${id}:`, error);
    throw error;
  }
};

export const facturacionService = {
  getFacturas,
  getFacturaById,
  createFactura,
  updateFactura,
  deleteFactura,
};
