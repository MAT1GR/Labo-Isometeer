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

// Función para manejar errores de forma centralizada y clara
const handleError = (res: Response, error: unknown, functionName: string) => {
  const message =
    error instanceof Error ? error.message : "Ocurrió un error desconocido";
  console.error(`[ERROR] en ${functionName}:`, message);
  res
    .status(500)
    .json({
      error: `Fallo en el servidor al ejecutar ${functionName}: ${message}`,
    });
};

export const getEstadisticasCobranza = (req: Request, res: Response) => {
  try {
    const row = db.prepare("SELECT SUM(monto) as total FROM cobros").get() as
      | SumResult
      | undefined;
    res.json({ total: row?.total || 0 });
  } catch (error: unknown) {
    handleError(res, error, "getEstadisticasCobranza");
  }
};

export const getEstadisticasFacturacion = (req: Request, res: Response) => {
  try {
    const total =
      (
        db.prepare("SELECT SUM(monto) as total FROM facturas").get() as
          | SumResult
          | undefined
      )?.total || 0;
    const pendientes =
      (
        db
          .prepare(
            "SELECT SUM(monto) as pendientes FROM facturas WHERE estado = 'pendiente'"
          )
          .get() as { pendientes: number | null } | undefined
      )?.pendientes || 0;
    const vencidas =
      (
        db
          .prepare(
            "SELECT SUM(monto) as vencidas FROM facturas WHERE estado = 'vencida'"
          )
          .get() as { vencidas: number | null } | undefined
      )?.vencidas || 0;
    res.json({ total, pendientes, vencidas });
  } catch (error: unknown) {
    handleError(res, error, "getEstadisticasFacturacion");
  }
};

export const getPagos = (req: Request, res: Response) => {
  try {
    // CORRECCIÓN: Se cambió 'c.numero_recibo' por 'c.identificacion_cobro' y se le da un alias para que el frontend funcione.
    const rows = db
      .prepare(
        `
            SELECT c.id, c.identificacion_cobro as numero_recibo, c.monto, f.numero_factura 
            FROM cobros c 
            LEFT JOIN facturas f ON c.factura_id = f.id 
            ORDER BY c.fecha DESC LIMIT 8
        `
      )
      .all();
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
  try {
    const cobranzaPorTipoOT = db
      .prepare(
        `
            SELECT wo.type, SUM(c.monto) as monto
            FROM cobros c
            JOIN facturas f ON c.factura_id = f.id
            JOIN factura_ots fo ON f.id = fo.factura_id
            JOIN work_orders wo ON fo.ot_id = wo.id
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
            GROUP BY wo.type
        `
      )
      .all();

    const otsAbiertasRow = db
      .prepare(
        "SELECT COUNT(*) as count FROM work_orders WHERE status = 'abierta'"
      )
      .get() as CountResult | undefined;
    const otsAbiertas = otsAbiertasRow?.count || 0;

    const otsPendientesPorTipo = db
      .prepare(
        `
            SELECT type, COUNT(*) as cantidad 
            FROM work_orders 
            WHERE status = 'pendiente de cierre' 
            GROUP BY type
        `
      )
      .all();

    // CORRECCIÓN: Se cambió 'f.client_id' por 'f.cliente_id'.
    const topClientes = db
      .prepare(
        `
            SELECT c.name, SUM(f.monto) as monto 
            FROM facturas f
            JOIN clients c ON f.cliente_id = c.id
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
