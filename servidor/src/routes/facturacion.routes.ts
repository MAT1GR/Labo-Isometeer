import { Router } from "express";
import db from "../config/database";

const router = Router();

// [GET] /api/facturacion - Obtener todas las facturas
router.get("/", (req, res) => {
  try {
    const facturas = db
      .prepare(
        `
      SELECT 
        f.id, f.numero_factura, f.monto, f.vencimiento, f.estado, f.cliente_id, f.created_at,
        c.name as cliente_name,
        (SELECT SUM(monto) FROM cobros WHERE factura_id = f.id) as pagado,
        GROUP_CONCAT(ot.custom_id) as ots_asociadas
      FROM facturas f
      LEFT JOIN clients c ON f.cliente_id = c.id
      LEFT JOIN factura_ots fo ON f.id = fo.factura_id
      LEFT JOIN work_orders ot ON fo.ot_id = ot.id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `
      )
      .all();
    res.json(facturas);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las facturas." });
  }
});

// [GET] /api/facturacion/:id - Obtener una factura por ID
router.get("/:id", (req, res) => {
  try {
    const factura = db
      .prepare(
        "SELECT *, c.name as cliente_name FROM facturas f JOIN clients c ON f.cliente_id = c.id WHERE f.id = ?"
      )
      .get(req.params.id);
    if (factura) {
      const cobros = db
        .prepare(
          "SELECT * FROM cobros WHERE factura_id = ? ORDER BY fecha DESC"
        )
        .all(req.params.id);
      const ots = db
        .prepare(
          `
        SELECT ot.id, ot.custom_id, ot.product 
        FROM work_orders ot
        JOIN factura_ots fo ON ot.id = fo.ot_id
        WHERE fo.factura_id = ?
      `
        )
        .all(req.params.id);

      res.json({ ...factura, cobros, ots });
    } else {
      res.status(404).json({ error: "Factura no encontrada." });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la factura." });
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

  const transaction = db.transaction(() => {
    const stmt = db.prepare(
      "INSERT INTO facturas (numero_factura, monto, vencimiento, estado, cliente_id) VALUES (?, ?, ?, 'pendiente', ?)"
    );
    const info = stmt.run(numero_factura, monto, vencimiento, cliente_id);
    const facturaId = info.lastInsertRowid;

    if (ot_ids && ot_ids.length > 0) {
      const linkStmt = db.prepare(
        "INSERT INTO factura_ots (factura_id, ot_id) VALUES (?, ?)"
      );
      for (const ot_id of ot_ids) {
        linkStmt.run(facturaId, ot_id);
      }
    }
    return { id: facturaId };
  });

  try {
    const result = transaction();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Error al crear la factura." });
  }
});

// [POST] /api/facturacion/:id/cobros - Añadir un cobro
router.post("/:id/cobros", (req, res) => {
  const { monto, medio_de_pago, fecha } = req.body;
  const factura_id = req.params.id;

  const transaction = db.transaction(() => {
    // 1. Insertar el nuevo cobro
    const stmt = db.prepare(
      "INSERT INTO cobros (factura_id, monto, medio_de_pago, fecha) VALUES (?, ?, ?, ?)"
    );
    const info = stmt.run(factura_id, monto, medio_de_pago, fecha);
    const newCobroId = info.lastInsertRowid;

    // 2. Calcular el total pagado para esta factura
    const totalPagadoResult = db
      .prepare("SELECT SUM(monto) as total FROM cobros WHERE factura_id = ?")
      .get(factura_id) as { total: number };
    const totalPagado = totalPagadoResult.total || 0;

    // 3. Obtener el monto total de la factura
    const facturaResult = db
      .prepare("SELECT monto FROM facturas WHERE id = ?")
      .get(factura_id) as { monto: number };
    const montoFactura = facturaResult.monto;

    // 4. Actualizar el estado de la factura si es necesario
    if (totalPagado >= montoFactura) {
      db.prepare("UPDATE facturas SET estado = 'pagada' WHERE id = ?").run(
        factura_id
      );
    } else {
      db.prepare("UPDATE facturas SET estado = 'pendiente' WHERE id = ?").run(
        factura_id
      );
    }

    // 5. Devolver el cobro recién creado
    return db.prepare("SELECT * FROM cobros WHERE id = ?").get(newCobroId);
  });

  try {
    const newCobro = transaction();
    res.status(201).json(newCobro);
  } catch (error) {
    res.status(500).json({ error: "Error al registrar el cobro." });
  }
});

// ==================================================================
// RUTA AÑADIDA PARA SOLUCIONAR EL ERROR 404
// ==================================================================
// [GET] /api/facturacion/cliente/:id - Obtener facturas por ID de cliente
router.get("/cliente/:id", (req, res) => {
  try {
    const facturas = db
      .prepare(
        `SELECT id, numero_factura, monto FROM facturas WHERE cliente_id = ? ORDER BY created_at DESC`
      )
      .all(req.params.id);
    res.json(facturas);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al obtener las facturas del cliente." });
  }
});

export default router;
