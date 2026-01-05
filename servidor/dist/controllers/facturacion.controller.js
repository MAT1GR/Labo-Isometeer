"use strict";
// RUTA: servidor/src/controllers/facturacion.controller.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFactura = exports.unarchiveFactura = void 0;
const database_1 = __importDefault(require("../config/database"));
// NOTA: Si ya tienes otras funciones en este archivo, déjalas como están.
// Estas son las nuevas funciones que debes añadir.
/**
 * Pasa una factura del estado 'archivada' a 'pagada'.
 */
const unarchiveFactura = (req, res) => {
    const { id } = req.params;
    try {
        const info = database_1.default
            .prepare("UPDATE facturas SET estado = 'pagada' WHERE id = ? AND estado = 'archivada'")
            .run(id);
        if (info.changes === 0) {
            return res
                .status(404)
                .json({ error: "Factura no encontrada o no estaba archivada." });
        }
        res.status(200).json({ message: "Factura desarchivada con éxito." });
    }
    catch (error) {
        console.error("Error al desarchivar la factura:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};
exports.unarchiveFactura = unarchiveFactura;
/**
 * Elimina una factura permanentemente de la base de datos.
 */
const deleteFactura = (req, res) => {
    const { id } = req.params;
    try {
        // Para mantener la integridad de la base de datos, primero eliminamos las asociaciones.
        database_1.default.prepare("DELETE FROM factura_ots WHERE factura_id = ?").run(id);
        // Luego, eliminamos la factura principal.
        const info = database_1.default.prepare("DELETE FROM facturas WHERE id = ?").run(id);
        if (info.changes === 0) {
            return res.status(404).json({ error: "Factura no encontrada." });
        }
        res.status(200).json({ message: "Factura eliminada permanentemente." });
    }
    catch (error) {
        console.error("Error al eliminar la factura:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
};
exports.deleteFactura = deleteFactura;
// Aquí irían el resto de tus funciones del controlador, como:
// export const getAllFacturas = (req: Request, res: Response) => { ... };
// export const getFacturaById = (req: Request, res: Response) => { ... };
// etc.
