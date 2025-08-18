// RUTA: servidor/src/routes/facturacion.routes.ts
import { Router, Request, Response } from "express";
import db from "../config/database";

const router = Router();

// [GET] /api/facturacion - Obtener todas las facturas
router.get("/", (req: Request, res: Response) => {
  try {
    const facturas = db
      .prepare(
        `
      SELECT 
        f.id, f.numero_factura, f.monto, f.vencimiento, f.estado,
        c.name as cliente_name,
        COALESCE(SUM(co.monto), 0) as pagado,
        GROUP_CONCAT(ot.custom_id, ', ') as ots_asociadas
      FROM facturas f
      LEFT JOIN clients c ON f.cliente_id = c.id
      LEFT JOIN cobros co ON f.id = co.factura_id
      LEFT JOIN factura_ots fo ON f.id = fo.factura_id
      LEFT JOIN work_orders ot ON fo.ot_id = ot.id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `
      )
      .all();
    res.status(200).json(facturas);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las facturas." });
  }
});

// [GET] /api/facturacion/:id - Obtener una factura, sus cobros y sus OTs
router.get("/:id", (req: Request, res: Response) => {
  try {
    const factura = db
      .prepare(
        `
      SELECT f.*, c.name as cliente_name
      FROM facturas f
      LEFT JOIN clients c ON f.cliente_id = c.id
      WHERE f.id = ?
    `
      )
      .get(req.params.id);

    if (!factura) {
      return res.status(404).json({ error: "Factura no encontrada." });
    }

    const cobros = db
      .prepare("SELECT * FROM cobros WHERE factura_id = ? ORDER BY fecha DESC")
      .all(req.params.id);
    const ots = db
      .prepare(
        `
        SELECT ot.id, ot.custom_id, ot.product as title, ot.status
        FROM work_orders ot
        JOIN factura_ots fo ON ot.id = fo.ot_id
        WHERE fo.factura_id = ?
    `
      )
      .all(req.params.id);

    const totalPagado =
      (
        db
          .prepare(
            "SELECT SUM(monto) as total FROM cobros WHERE factura_id = ?"
          )
          .get(req.params.id) as { total: number }
      )?.total || 0;

    res.status(200).json({ ...factura, cobros, ots, pagado: totalPagado });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la factura." });
  }
});

// [POST] /api/facturacion - Crear una nueva factura
router.post("/", (req: Request, res: Response) => {
  const { numero_factura, monto, vencimiento, cliente_id, ot_ids } = req.body;

  if (!numero_factura || !monto || !vencimiento || !cliente_id) {
    return res.status(400).json({
      error: "Número de factura, monto, vencimiento y cliente son requeridos.",
    });
  }

  try {
    const createInvoiceTransaction = db.transaction(() => {
      const info = db
        .prepare(
          "INSERT INTO facturas (numero_factura, monto, vencimiento, cliente_id) VALUES (?, ?, ?, ?)"
        )
        .run(numero_factura, monto, vencimiento, cliente_id);
      const factura_id = info.lastInsertRowid;

      if (ot_ids && Array.isArray(ot_ids) && ot_ids.length > 0) {
        const insertLink = db.prepare(
          "INSERT INTO factura_ots (factura_id, ot_id) VALUES (?, ?)"
        );
        for (const ot_id of ot_ids) {
          insertLink.run(factura_id, ot_id);
          db.prepare(
            "UPDATE work_orders SET status = 'facturada' WHERE id = ?"
          ).run(ot_id);
        }
      }

      return { id: factura_id, numero_factura };
    });

    const result = createInvoiceTransaction();
    res.status(201).json(result);
  } catch (error: any) {
    console.error("[ERROR] Creando factura:", error);
    res.status(500).json({
      error: "Error del servidor al crear la factura.",
      details: error.message,
    });
  }
});

// [POST] /api/facturacion/:id/cobros - Añadir un cobro a una factura
router.post("/:id/cobros", (req: Request, res: Response) => {
  const { id } = req.params;
  const { monto, medio_de_pago, fecha } = req.body;

  if (!monto || !medio_de_pago || !fecha) {
    return res
      .status(400)
      .json({ error: "Todos los campos del cobro son requeridos." });
  }

  try {
    const addCobroTransaction = db.transaction(() => {
      const factura = db
        .prepare("SELECT monto, estado FROM facturas WHERE id = ?")
        .get(id) as { monto: number; estado: string };

      if (!factura) {
        return { error: "Factura no encontrada.", status: 404 };
      }
      if (factura.estado === "pagada") {
        return {
          error: "La factura ya está completamente pagada.",
          status: 400,
        };
      }

      const info = db
        .prepare(
          "INSERT INTO cobros (factura_id, monto, medio_de_pago, fecha) VALUES (?, ?, ?, ?)"
        )
        .run(id, monto, medio_de_pago, fecha);

      const cobro_id = info.lastInsertRowid;

      const totalPagadoResult = db
        .prepare("SELECT SUM(monto) as total FROM cobros WHERE factura_id = ?")
        .get(id) as { total: number | null };

      const totalPagado = totalPagadoResult?.total || 0;

      if (totalPagado >= factura.monto - 0.001) {
        db.prepare("UPDATE facturas SET estado = 'pagada' WHERE id = ?").run(
          id
        );
      }

      return db.prepare("SELECT * FROM cobros WHERE id = ?").get(cobro_id);
    });

    const result = addCobroTransaction() as any;

    if (result && result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error al registrar el cobro:", error);
    res
      .status(500)
      .json({ error: "Error interno del servidor al añadir el cobro." });
  }
});

export default router;
