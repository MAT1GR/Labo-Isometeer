// RUTA: servidor/src/controllers/facturacion.controller.ts

import { Request, Response } from "express";
import db from "../config/database";

// NOTA: Si ya tienes otras funciones en este archivo, déjalas como están.
// Estas son las nuevas funciones que debes añadir.

/**
 * Pasa una factura del estado 'archivada' a 'pagada'.
 */
export const unarchiveFactura = (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const info = db
      .prepare(
        "UPDATE facturas SET estado = 'pagada' WHERE id = ? AND estado = 'archivada'"
      )
      .run(id);

    if (info.changes === 0) {
      return res
        .status(404)
        .json({ error: "Factura no encontrada o no estaba archivada." });
    }

    res.status(200).json({ message: "Factura desarchivada con éxito." });
  } catch (error) {
    console.error("Error al desarchivar la factura:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

/**
 * Elimina una factura permanentemente de la base de datos.
 */
export const deleteFactura = (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Para mantener la integridad de la base de datos, primero eliminamos las asociaciones.
    db.prepare("DELETE FROM factura_ots WHERE factura_id = ?").run(id);

    // Luego, eliminamos la factura principal.
    const info = db.prepare("DELETE FROM facturas WHERE id = ?").run(id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Factura no encontrada." });
    }

    res.status(200).json({ message: "Factura eliminada permanentemente." });
  } catch (error) {
    console.error("Error al eliminar la factura:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

// Aquí irían el resto de tus funciones del controlador, como:
// export const getAllFacturas = (req: Request, res: Response) => { ... };
// export const getFacturaById = (req: Request, res: Response) => { ... };
// etc.
