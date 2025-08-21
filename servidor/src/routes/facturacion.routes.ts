// RUTA: /servidor/src/routes/facturacion.routes.ts

import { Router } from "express";
import db from "../config/database";

const router = Router();

// [GET] /api/facturacion - Obtener todas las facturas
router.get("/", (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    db.prepare(
      `UPDATE facturas SET estado = 'vencida' WHERE vencimiento < ? AND estado = 'pendiente'`
    ).run(today);

    const facturas = db
      .prepare(
        `
      SELECT 
        f.id, f.numero_factura, f.monto, f.iva, f.vencimiento, f.estado, f.cliente_id, f.created_at,
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
    console.error("Error al obtener las facturas:", error);
    res.status(500).json({ error: "Error al obtener las facturas." });
  }
});

// [GET] /api/facturacion/:id - Obtener una factura por ID
router.get("/:id", (req, res) => {
  try {
    const facturaId = req.params.id;
    const factura = db
      .prepare(
        "SELECT f.*, c.name as cliente_name FROM facturas f LEFT JOIN clients c ON f.cliente_id = c.id WHERE f.id = ?"
      )
      .get(facturaId);

    if (!factura) {
      return res.status(404).json({ error: "Factura no encontrada." });
    }

    const fullFactura: any = { ...factura };

    fullFactura.cobros = db
      .prepare("SELECT * FROM cobros WHERE factura_id = ? ORDER BY fecha DESC")
      .all(facturaId);

    const ots = db
      .prepare(
        `
      SELECT ot.id, ot.custom_id, ot.product 
      FROM work_orders ot
      JOIN factura_ots fo ON ot.id = fo.ot_id
      WHERE fo.factura_id = ?
    `
      )
      .all(facturaId) as {
      id: number;
      custom_id: string;
      product: string;
      activities?: any[];
    }[];

    if (ots && ots.length > 0) {
      const otIds = ots.map((ot) => ot.id);
      const placeholders = otIds.map(() => "?").join(",");

      const allActivities = db
        .prepare(
          `SELECT work_order_id, activity as name, precio_sin_iva 
         FROM work_order_activities 
         WHERE work_order_id IN (${placeholders}) AND precio_sin_iva IS NOT NULL`
        )
        .all(...otIds) as {
        work_order_id: number;
        name: string;
        precio_sin_iva: number;
      }[];

      ots.forEach((ot) => {
        ot.activities = allActivities.filter(
          (act) => act.work_order_id === ot.id
        );
      });
    }

    fullFactura.ots = ots;

    res.json(fullFactura);
  } catch (error) {
    console.error(
      `Error al obtener la factura con ID ${req.params.id}:`,
      error
    );
    res.status(500).json({ error: "Error interno al obtener la factura." });
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
    calculation_type = "manual",
  } = req.body;

  if (!numero_factura || !vencimiento || !cliente_id) {
    return res.status(400).json({ message: "Faltan campos obligatorios." });
  }

  try {
    const transaction = db.transaction(() => {
      let montoNeto = 0;
      let totalIva = 0;

      if (calculation_type === "activities" && ot_ids.length > 0) {
        const placeholders = ot_ids.map(() => "?").join(",");
        const activitiesQuery = `
          SELECT
            wa.precio_sin_iva,
            wo.type AS ot_type
          FROM work_order_activities wa
          JOIN work_orders wo ON wa.work_order_id = wo.id
          WHERE wa.work_order_id IN (${placeholders})
        `;

        // --- LA CORRECCIÓN ESTÁ AQUÍ ---
        // Usamos el operador "spread" (...) para pasar cada ID como un argumento separado.
        const activities = db.prepare(activitiesQuery).all(...ot_ids) as {
          precio_sin_iva: number;
          ot_type: string;
        }[];

        if (activities.length === 0) {
          throw new Error(
            "No se encontraron actividades con precio para las OTs seleccionadas."
          );
        }

        for (const activity of activities) {
          const precio = activity.precio_sin_iva || 0;
          montoNeto += precio;
          totalIva +=
            precio * (activity.ot_type === "Produccion" ? 0.105 : 0.21);
        }
      } else {
        montoNeto = Number(monto) || 0;
        if (montoNeto <= 0) {
          throw new Error(
            "Para el cálculo manual, el monto debe ser mayor a cero."
          );
        }
        totalIva = montoNeto * 0.21;
      }

      const montoFinal = montoNeto + totalIva;

      const insertFacturaStmt = db.prepare(
        "INSERT INTO facturas (numero_factura, monto, iva, vencimiento, estado, cliente_id) VALUES (?, ?, ?, ?, 'pendiente', ?)"
      );
      const info = insertFacturaStmt.run(
        numero_factura,
        montoFinal,
        totalIva,
        vencimiento,
        cliente_id
      );
      const facturaId = info.lastInsertRowid;

      if (ot_ids.length > 0) {
        const linkStmt = db.prepare(
          "INSERT INTO factura_ots (factura_id, ot_id) VALUES (?, ?)"
        );
        for (const ot_id of ot_ids) {
          linkStmt.run(facturaId, ot_id);
        }
      }
      return { id: facturaId };
    });

    const result = transaction();
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error al crear la factura:", error);
    res
      .status(500)
      .json({ error: error.message || "Error interno al crear la factura." });
  }
});

// [POST] /api/facturacion/:id/cobros - Añadir un cobro
router.post("/:id/cobros", (req, res) => {
  const { monto, medio_de_pago, fecha } = req.body;
  const factura_id = req.params.id;

  try {
    const transaction = db.transaction(() => {
      const stmt = db.prepare(
        "INSERT INTO cobros (factura_id, monto, medio_de_pago, fecha) VALUES (?, ?, ?, ?)"
      );
      const info = stmt.run(factura_id, monto, medio_de_pago, fecha);
      const newCobroId = info.lastInsertRowid;

      const totalPagadoResult = db
        .prepare("SELECT SUM(monto) as total FROM cobros WHERE factura_id = ?")
        .get(factura_id) as { total: number };
      const totalPagado = totalPagadoResult.total || 0;

      const facturaResult = db
        .prepare("SELECT monto FROM facturas WHERE id = ?")
        .get(factura_id) as { monto: number };
      const montoFactura = facturaResult.monto;

      if (totalPagado >= montoFactura) {
        db.prepare("UPDATE facturas SET estado = 'pagada' WHERE id = ?").run(
          factura_id
        );
      } else {
        db.prepare("UPDATE facturas SET estado = 'pendiente' WHERE id = ?").run(
          factura_id
        );
      }

      return db.prepare("SELECT * FROM cobros WHERE id = ?").get(newCobroId);
    });

    const newCobro = transaction();
    res.status(201).json(newCobro);
  } catch (error) {
    console.error("Error al registrar el cobro:", error);
    res.status(500).json({ error: "Error al registrar el cobro." });
  }
});

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
