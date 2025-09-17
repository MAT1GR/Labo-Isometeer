"use strict";
// RUTA: servidor/src/controllers/statistics.controller.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEstadisticasOT = exports.getFacturas = exports.getPagos = exports.getEstadisticasFacturacion = exports.getEstadisticasCobranza = void 0;
const database_1 = __importDefault(require("../config/database"));
// Función para manejar errores de forma centralizada y clara
const handleError = (res, error, functionName) => {
    const message = error instanceof Error ? error.message : "Ocurrió un error desconocido";
    console.error(`[ERROR] en ${functionName}:`, message);
    res.status(500).json({
        error: `Fallo en el servidor al ejecutar ${functionName}: ${message}`,
    });
};
const getEstadisticasCobranza = (req, res) => {
    try {
        const row = database_1.default.prepare("SELECT SUM(monto) as total FROM cobros").get();
        res.json({ total: (row === null || row === void 0 ? void 0 : row.total) || 0 });
    }
    catch (error) {
        handleError(res, error, "getEstadisticasCobranza");
    }
};
exports.getEstadisticasCobranza = getEstadisticasCobranza;
const getEstadisticasFacturacion = (req, res) => {
    var _a, _b, _c;
    try {
        const total = ((_a = database_1.default.prepare("SELECT SUM(monto) as total FROM facturas").get()) === null || _a === void 0 ? void 0 : _a.total) || 0;
        const pendientes = ((_b = database_1.default
            .prepare("SELECT SUM(monto) as pendientes FROM facturas WHERE estado = 'pendiente'")
            .get()) === null || _b === void 0 ? void 0 : _b.pendientes) || 0;
        const vencidas = ((_c = database_1.default
            .prepare("SELECT SUM(monto) as vencidas FROM facturas WHERE estado = 'vencida'")
            .get()) === null || _c === void 0 ? void 0 : _c.vencidas) || 0;
        res.json({ total, pendientes, vencidas });
    }
    catch (error) {
        handleError(res, error, "getEstadisticasFacturacion");
    }
};
exports.getEstadisticasFacturacion = getEstadisticasFacturacion;
const getPagos = (req, res) => {
    try {
        // CORRECCIÓN: Se cambió 'c.numero_recibo' por 'c.identificacion_cobro' y se le da un alias para que el frontend funcione.
        const rows = database_1.default
            .prepare(`
            SELECT c.id, c.identificacion_cobro as numero_recibo, c.monto, f.numero_factura 
            FROM cobros c 
            LEFT JOIN facturas f ON c.factura_id = f.id 
            ORDER BY c.fecha DESC LIMIT 8
        `)
            .all();
        res.json(rows);
    }
    catch (error) {
        handleError(res, error, "getPagos (cobros)");
    }
};
exports.getPagos = getPagos;
const getFacturas = (req, res) => {
    try {
        const rows = database_1.default
            .prepare("SELECT * FROM facturas ORDER BY fecha_emision DESC LIMIT 29")
            .all();
        res.json(rows);
    }
    catch (error) {
        handleError(res, error, "getFacturas");
    }
};
exports.getFacturas = getFacturas;
const getEstadisticasOT = (req, res) => {
    try {
        const cobranzaPorTipoOT = database_1.default
            .prepare(`
            SELECT wo.type, SUM(c.monto) as monto
            FROM cobros c
            JOIN facturas f ON c.factura_id = f.id
            JOIN factura_ots fo ON f.id = fo.factura_id
            JOIN work_orders wo ON fo.ot_id = wo.id
            GROUP BY wo.type
        `)
            .all();
        const facturacionPorTipoOT = database_1.default
            .prepare(`
            SELECT wo.type, SUM(f.monto) as monto
            FROM facturas f
            JOIN factura_ots fo ON f.id = fo.factura_id
            JOIN work_orders wo ON fo.ot_id = wo.id
            GROUP BY wo.type
        `)
            .all();
        // --- CORRECCIÓN AQUÍ ---
        // Se cambió el estado 'abierta' por 'en progreso'
        const otsAbiertasRow = database_1.default
            .prepare("SELECT COUNT(*) as count FROM work_orders WHERE status = 'en progreso'")
            .get();
        const otsAbiertas = (otsAbiertasRow === null || otsAbiertasRow === void 0 ? void 0 : otsAbiertasRow.count) || 0;
        const otsPendientesPorTipo = database_1.default
            .prepare(`
            SELECT type, COUNT(*) as cantidad 
            FROM work_orders 
            WHERE status = 'pendiente' 
            GROUP BY type
        `)
            .all();
        const topClientes = database_1.default
            .prepare(`
            SELECT c.name, SUM(f.monto) as monto 
            FROM facturas f
            JOIN clients c ON f.cliente_id = c.id
            GROUP BY c.name 
            ORDER BY monto DESC 
            LIMIT 10
        `)
            .all();
        res.json({
            cobranzaPorTipoOT,
            facturacionPorTipoOT,
            otsAbiertas,
            otsPendientesPorTipo,
            topClientes,
        });
    }
    catch (error) {
        handleError(res, error, "getEstadisticasOT");
    }
};
exports.getEstadisticasOT = getEstadisticasOT;
