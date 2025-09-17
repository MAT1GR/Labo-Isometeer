// RUTA: servidor/src/controllers/statistics.controller.ts

import { Request, Response } from "express";
import db from "../config/database";

// --- Interfaces para ayudar a TypeScript a entender los datos ---
interface SumResult {
  total: number | null;
}
interface CountResult {
  count: number;
}

// --- NUEVO: Función para obtener el rango de fechas según el período ---
const getDateRange = (period: string) => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "semanal":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "mensual":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "anual":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      // Si no se especifica un período válido, no se filtra por fecha.
      return null;
  }

  return {
    // Formato YYYY-MM-DD HH:MM:SS
    start: startDate.toISOString().slice(0, 19).replace("T", " "),
    end: new Date().toISOString().slice(0, 19).replace("T", " "),
  };
};

// Función para manejar errores de forma centralizada y clara
const handleError = (res: Response, error: unknown, functionName: string) => {
  const message =
    error instanceof Error ? error.message : "Ocurrió un error desconocido";
  console.error(`[ERROR] en ${functionName}:`, message);
  res.status(500).json({
    error: `Fallo en el servidor al ejecutar ${functionName}: ${message}`,
  });
};

export const getEstadisticasCobranza = (req: Request, res: Response) => {
  // --- MODIFICACIÓN: Se obtiene el período de la consulta ---
  const period = req.query.period as string;
  const dateRange = getDateRange(period);

  let query = "SELECT SUM(monto) as total FROM cobros";
  const params: any[] = [];

  if (dateRange) {
    query += " WHERE fecha BETWEEN ? AND ?";
    params.push(dateRange.start, dateRange.end);
  }

  try {
    const row = db.prepare(query).get(params) as SumResult | undefined;
    res.json({ total: row?.total || 0 });
  } catch (error: unknown) {
    handleError(res, error, "getEstadisticasCobranza");
  }
};

export const getEstadisticasFacturacion = (req: Request, res: Response) => {
  // --- MODIFICACIÓN: Se obtiene el período de la consulta ---
  const period = req.query.period as string;
  const dateRange = getDateRange(period);
  const whereClause = dateRange
    ? `WHERE fecha_emision BETWEEN '${dateRange.start}' AND '${dateRange.end}'`
    : "";

  try {
    const total =
      (
        db
          .prepare(`SELECT SUM(monto) as total FROM facturas ${whereClause}`)
          .get() as SumResult | undefined
      )?.total || 0;
    const pendientes =
      (
        db
          .prepare(
            `SELECT SUM(monto) as pendientes FROM facturas WHERE estado = 'pendiente' ${
              dateRange
                ? `AND fecha_emision BETWEEN '${dateRange.start}' AND '${dateRange.end}'`
                : ""
            }`
          )
          .get() as { pendientes: number | null } | undefined
      )?.pendientes || 0;
    const vencidas =
      (
        db
          .prepare(
            `SELECT SUM(monto) as vencidas FROM facturas WHERE estado = 'vencida' ${
              dateRange
                ? `AND fecha_emision BETWEEN '${dateRange.start}' AND '${dateRange.end}'`
                : ""
            }`
          )
          .get() as { vencidas: number | null } | undefined
      )?.vencidas || 0;
    res.json({ total, pendientes, vencidas });
  } catch (error: unknown) {
    handleError(res, error, "getEstadisticasFacturacion");
  }
};

export const getPagos = (req: Request, res: Response) => {
  // --- MODIFICACIÓN: Se obtiene el período de la consulta ---
  const period = req.query.period as string;
  const dateRange = getDateRange(period);

  let query = `
        SELECT c.id, c.identificacion_cobro as numero_recibo, c.monto, f.numero_factura 
        FROM cobros c 
        LEFT JOIN facturas f ON c.factura_id = f.id 
    `;
  const params: any[] = [];

  if (dateRange) {
    query += " WHERE c.fecha BETWEEN ? AND ?";
    params.push(dateRange.start, dateRange.end);
  }

  query += " ORDER BY c.fecha DESC LIMIT 8";
  try {
    // CORRECCIÓN: Se cambió 'c.numero_recibo' por 'c.identificacion_cobro' y se le da un alias para que el frontend funcione.
    const rows = db.prepare(query).all(params);
    res.json(rows);
  } catch (error: unknown) {
    handleError(res, error, "getPagos (cobros)");
  }
};

export const getFacturas = (req: Request, res: Response) => {
  try {
    const rows = db
      .prepare("SELECT * FROM facturas ORDER BY fecha_emision DESC LIMIT 29")
      .all();
    res.json(rows);
  } catch (error: unknown) {
    handleError(res, error, "getFacturas");
  }
};

export const getEstadisticasOT = (req: Request, res: Response) => {
  // --- MODIFICACIÓN: Se obtiene el período de la consulta ---
  const period = req.query.period as string;
  const dateRange = getDateRange(period);

  const cobranzaWhere = dateRange
    ? `AND c.fecha BETWEEN '${dateRange.start}' AND '${dateRange.end}'`
    : "";
  const facturacionWhere = dateRange
    ? `AND f.fecha_emision BETWEEN '${dateRange.start}' AND '${dateRange.end}'`
    : "";

  try {
    const cobranzaPorTipoOT = db
      .prepare(
        `
            SELECT wo.type, SUM(c.monto) as monto
            FROM cobros c
            JOIN facturas f ON c.factura_id = f.id
            JOIN factura_ots fo ON f.id = fo.factura_id
            JOIN work_orders wo ON fo.ot_id = wo.id
            WHERE 1=1 ${cobranzaWhere}
            GROUP BY wo.type
        `
      )
      .all();

    const facturacionPorTipoOT = db
      .prepare(
        `
            SELECT wo.type, SUM(f.monto) as monto
            FROM facturas f
            JOIN factura_ots fo ON f.id = fo.factura_id
            JOIN work_orders wo ON fo.ot_id = wo.id
            WHERE 1=1 ${facturacionWhere}
            GROUP BY wo.type
        `
      )
      .all();

    // --- CORRECCIÓN AQUÍ ---
    // Se cambió el estado 'abierta' por 'en progreso'
    const otsAbiertasRow = db
      .prepare(
        "SELECT COUNT(*) as count FROM work_orders WHERE status = 'en progreso'"
      )
      .get() as CountResult | undefined;
    const otsAbiertas = otsAbiertasRow?.count || 0;

    const otsPendientesPorTipo = db
      .prepare(
        `
            SELECT type, COUNT(*) as cantidad 
            FROM work_orders 
            WHERE status = 'pendiente' 
            GROUP BY type
        `
      )
      .all();

    const topClientes = db
      .prepare(
        `
            SELECT c.name, SUM(f.monto) as monto 
            FROM facturas f
            JOIN clients c ON f.cliente_id = c.id
            WHERE 1=1 ${facturacionWhere}
            GROUP BY c.name 
            ORDER BY monto DESC 
            LIMIT 10
        `
      )
      .all();

    res.json({
      cobranzaPorTipoOT,
      facturacionPorTipoOT,
      otsAbiertas,
      otsPendientesPorTipo,
      topClientes,
    });
  } catch (error: unknown) {
    handleError(res, error, "getEstadisticasOT");
  }
};
