// RUTA: /servidor/src/routes/facturacion.routes.ts

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
          f.id,
          f.numero_factura,
          f.monto,
          f.vencimiento,
          f.estado,
          c.name as cliente_name,
          (SELECT SUM(monto) FROM cobros WHERE factura_id = f.id) as pagado,
          json_group_array(json_object('id', ot.id, 'custom_id', ot.custom_id, 'product', ot.product)) FILTER (WHERE ot.id IS NOT NULL) as ots
        FROM facturas f
        LEFT JOIN clients c ON f.cliente_id = c.id
        LEFT JOIN factura_ots fo ON f.id = fo.factura_id
        LEFT JOIN work_orders ot ON fo.ot_id = ot.id
        GROUP BY f.id
        ORDER BY f.created_at DESC
      `
      )
      .all()
      .map((factura: any) => ({
        ...factura,
        ots: factura.ots ? JSON.parse(factura.ots) : [],
        pagado: factura.pagado || 0,
      }));

    res.status(200).json(facturas);
  } catch (error) {
    console.error("Error al obtener las facturas:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// [GET] /api/facturacion/:id - Obtener una factura por ID
router.get("/:id", (req, res) => {
  try {
    const factura = db
      .prepare(
        `
        SELECT
          f.*,
          c.name as cliente_name,
          (SELECT SUM(monto) FROM cobros WHERE factura_id = f.id) as pagado
        FROM facturas f
        LEFT JOIN clients c ON f.cliente_id = c.id
        WHERE f.id = ?
      `
      )
      .get(req.params.id);

    if (factura) {
      const cobros = db
        .prepare("SELECT * FROM cobros WHERE factura_id = ?")
        .all(req.params.id);
      const ots = db
        .prepare(
          `
        SELECT ot.id, ot.custom_id, ot.product as title 
        FROM work_orders ot
        JOIN factura_ots fo ON ot.id = fo.ot_id
        WHERE fo.factura_id = ?
      `
        )
        .all(req.params.id);
      res.json({
        ...factura,
        pagado: (factura as any).pagado || 0,
        cobros,
        ots,
      });
    } else {
      res.status(404).json({ error: "Factura no encontrada" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la factura" });
  }
});

// [POST] /api/facturacion - Crear una nueva factura
router.post("/", (req, res) => {
  const {
    numero_factura,
    monto,
    vencimiento,
    cliente_id,
    ot_ids = [],
  } = req.body;

  if (!numero_factura || !monto || !vencimiento || !cliente_id) {
    return res.status(400).json({ error: "Faltan datos requeridos." });
  }

  const createTransaction = db.transaction(() => {
    const info = db
      .prepare(
        "INSERT INTO facturas (numero_factura, monto, vencimiento, cliente_id) VALUES (?, ?, ?, ?)"
      )
      .run(numero_factura, monto, vencimiento, cliente_id);
    const facturaId = info.lastInsertRowid;

    if (ot_ids.length > 0) {
      const stmt = db.prepare(
        "INSERT INTO factura_ots (factura_id, ot_id) VALUES (?, ?)"
      );
      for (const ot_id of ot_ids) {
        stmt.run(facturaId, ot_id);
        db.prepare(
          "UPDATE work_orders SET status = 'facturada' WHERE id = ?"
        ).run(ot_id);
      }
    }
    return { id: facturaId };
  });

  try {
    const result = createTransaction();
    res.status(201).json(result);
  } catch (error) {
    console.error("Error al crear la factura:", error);
    res.status(500).json({ error: "Error al crear la factura." });
  }
});

// [POST] /api/facturacion/:id/cobros - Registrar un cobro
router.post("/:id/cobros", (req, res) => {
  const { id: factura_id } = req.params;
  const { monto, medio_de_pago, fecha } = req.body;

  if (!monto || !medio_de_pago || !fecha) {
    return res.status(400).json({ error: "Faltan datos del cobro." });
  }

  const registerPayment = db.transaction(() => {
    // 1. Registrar el cobro
    const info = db
      .prepare(
        "INSERT INTO cobros (factura_id, monto, medio_de_pago, fecha) VALUES (?, ?, ?, ?)"
      )
      .run(factura_id, monto, medio_de_pago, fecha);

    // 2. Obtener el total de la factura y la suma de todos los cobros (incluido el nuevo)
    const data = db
      .prepare(
        `
        SELECT
          f.monto as total_factura,
          (SELECT SUM(c.monto) FROM cobros c WHERE c.factura_id = f.id) as total_pagado
        FROM facturas f
        WHERE f.id = ?
      `
      )
      .get(factura_id) as { total_factura: number; total_pagado: number };

    // 3. Actualizar el estado de la factura si está totalmente pagada
    if (data && data.total_pagado >= data.total_factura) {
      db.prepare("UPDATE facturas SET estado = 'pagada' WHERE id = ?").run(
        factura_id
      );
    }
    return { id: info.lastInsertRowid };
  });

  try {
    const result = registerPayment();
    res.status(201).json(result);
  } catch (error) {
    console.error("Error al registrar el cobro:", error);
    res.status(500).json({ error: "Error al registrar el cobro." });
  }
});

export default router;
