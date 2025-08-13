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
        SELECT ot.id, ot.custom_id, ot.title, ot.status
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

// [POST] /api/facturacion - Crear una nueva factura vinculada a OTs
router.post("/", (req: Request, res: Response) => {
  const { monto, vencimiento, ot_ids } = req.body;

  if (
    !monto ||
    !vencimiento ||
    !ot_ids ||
    !Array.isArray(ot_ids) ||
    ot_ids.length === 0
  ) {
    return res
      .status(400)
      .json({ error: "Monto, vencimiento y al menos una OT son requeridos." });
  }

  const createInvoiceTransaction = db.transaction(() => {
    // 1. Validar que todas las OTs pertenezcan al mismo cliente
    const firstOt = db
      .prepare("SELECT client_id FROM work_orders WHERE id = ?")
      .get(ot_ids[0]) as { client_id: number };
    if (!firstOt) throw new Error("Una de las OTs seleccionadas no existe.");
    const cliente_id = firstOt.client_id;

    for (const ot_id of ot_ids) {
      const ot = db
        .prepare("SELECT client_id FROM work_orders WHERE id = ?")
        .get(ot_id) as { client_id: number };
      if (ot.client_id !== cliente_id) {
        throw new Error("Todas las OTs deben pertenecer al mismo cliente.");
      }
    }

    // 2. Generar número de factura
    const year = new Date().getFullYear();
    const lastInvoice = db
      .prepare(
        "SELECT MAX(CAST(SUBSTR(numero_factura, 6) AS INTEGER)) as max_num FROM facturas WHERE numero_factura LIKE ?"
      )
      .get(`${year}-%`) as { max_num: number | null };
    const nextNum = (lastInvoice?.max_num || 0) + 1;
    const numero_factura = `${year}-${String(nextNum).padStart(5, "0")}`;

    // 3. Insertar la factura
    const info = db
      .prepare(
        "INSERT INTO facturas (numero_factura, monto, vencimiento, cliente_id) VALUES (?, ?, ?, ?)"
      )
      .run(numero_factura, monto, vencimiento, cliente_id);
    const factura_id = info.lastInsertRowid;

    // 4. Vincular las OTs a la factura
    const insertLink = db.prepare(
      "INSERT INTO factura_ots (factura_id, ot_id) VALUES (?, ?)"
    );
    for (const ot_id of ot_ids) {
      insertLink.run(factura_id, ot_id);
    }

    return { id: factura_id, numero_factura };
  });

  try {
    const result = createInvoiceTransaction();
    res.status(201).json(result);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: error.message || "Error al crear la factura." });
  }
});

// [POST] /api/facturacion/:id/cobros - Añadir un cobro a una factura
router.post("/:id/cobros", (req: Request, res: Response) => {
  const { id: factura_id } = req.params;
  const { monto, medio_de_pago, fecha } = req.body;

  if (!monto || !medio_de_pago || !fecha) {
    return res
      .status(400)
      .json({ error: "Todos los campos del cobro son requeridos." });
  }

  const addCobroTransaction = db.transaction(() => {
    const factura = db
      .prepare("SELECT monto, estado FROM facturas WHERE id = ?")
      .get(factura_id) as { monto: number; estado: string };
    if (!factura) {
      throw new Error("Factura no encontrada.");
    }
    if (factura.estado === "pagada") {
      throw new Error("La factura ya está pagada.");
    }

    db.prepare(
      "INSERT INTO cobros (factura_id, monto, medio_de_pago, fecha) VALUES (?, ?, ?, ?)"
    ).run(factura_id, monto, medio_de_pago, fecha);

    const totalPagado =
      (
        db
          .prepare(
            "SELECT SUM(monto) as total FROM cobros WHERE factura_id = ?"
          )
          .get(factura_id) as { total: number }
      ).total || 0;

    if (totalPagado >= factura.monto) {
      db.prepare("UPDATE facturas SET estado = 'pagada' WHERE id = ?").run(
        factura_id
      );
    }

    const nuevoCobro = db
      .prepare("SELECT * FROM cobros WHERE id = (SELECT last_insert_rowid())")
      .get();
    return nuevoCobro;
  });

  try {
    const nuevoCobro = addCobroTransaction();
    res.status(201).json(nuevoCobro);
  } catch (error: any) {
    res
      .status(500)
      .json({ error: error.message || "Error al añadir el cobro." });
  }
});

export default router;
