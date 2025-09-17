// RUTA: consultar/src/services/statisticsService.ts

import axiosInstance from "../api/axiosInstance";

// --- Interfaces para definir la estructura de los datos que esperamos del backend ---
// Es una buena práctica tener las interfaces en un archivo centralizado,
// pero por ahora las mantenemos aquí para claridad.
interface EstadisticasMonto {
  total?: number;
  pendientes?: number;
  vencidas?: number;
}
interface Pago {
  id: number;
  numero_recibo: string;
  monto: number;
  numero_factura: string | null;
}
interface EstadisticasOT {
  cobranzaPorTipoOT: { type: string; monto: number }[];
  facturacionPorTipoOT: { type: string; monto: number }[];
  otsAbiertas: number;
  otsPendientesPorTipo: { type: string; cantidad: number }[];
  topClientes: { name: string; monto: number }[];
}

/**
 * Obtiene las estadísticas de cobranza desde el servidor para un período específico.
 * @param periodo El período para filtrar los datos ('semanal', 'mensual', 'anual').
 * @returns Una promesa que se resuelve con las estadísticas de cobranza.
 */
export const getEstadisticasCobranza = async (
  periodo: string
): Promise<EstadisticasMonto> => {
  const response = await axiosInstance.get(
    `/statistics/cobranza?period=${periodo}`
  );
  return response.data;
};

/**
 * Obtiene las estadísticas de facturación desde el servidor para un período específico.
 * @param periodo El período para filtrar los datos ('semanal', 'mensual', 'anual').
 * @returns Una promesa que se resuelve con las estadísticas de facturación.
 */
export const getEstadisticasFacturacion = async (
  periodo: string
): Promise<EstadisticasMonto> => {
  const response = await axiosInstance.get(
    `/statistics/facturacion?period=${periodo}`
  );
  return response.data;
};

/**
 * Obtiene los pagos recientes desde el servidor para un período específico.
 * @param periodo El período para filtrar los datos ('semanal', 'mensual', 'anual').
 * @returns Una promesa que se resuelve con la lista de pagos.
 */
export const getPagos = async (periodo: string): Promise<Pago[]> => {
  const response = await axiosInstance.get(
    `/statistics/pagos?period=${periodo}`
  );
  return response.data;
};

/**
 * Obtiene las estadísticas de Órdenes de Trabajo (OT) desde el servidor para un período específico.
 * @param periodo El período para filtrar los datos ('semanal', 'mensual', 'anual').
 * @returns Una promesa que se resuelve con las estadísticas de OT.
 */
export const getEstadisticasOT = async (
  periodo: string
): Promise<EstadisticasOT> => {
  const response = await axiosInstance.get(`/statistics/ot?period=${periodo}`);
  return response.data;
};
