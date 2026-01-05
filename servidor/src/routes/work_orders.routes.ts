// RUTA: servidor/src/routes/work_orders.routes.ts

import { Router } from "express";
import db from "../config/database";
import { sseService } from "../services/sseService";

const router = Router();

// Obtener todas las órdenes de trabajo
router.get("/", (req, res) => {
  const {
    status,
    type,
    client_id,
    creator_id,
    date_from,
    date_to,
    authorized,
    facturada,
  } = req.query;

  let baseQuery = `
    SELECT 
      wo.*, 
      c.name as client_name, 
      u.name as creator_name,
      con.name as contact_name,
      CASE 
        WHEN EXISTS (SELECT 1 FROM factura_ots fo WHERE fo.ot_id = wo.id) THEN 1
        ELSE 0
      END as facturada
    FROM work_orders wo
    JOIN clients c ON wo.client_id = c.id
    JOIN users u ON wo.created_by = u.id
    LEFT JOIN contacts con ON wo.contact_id = con.id
  `;

  const whereClauses: string[] = [];
  const params: any[] = [];

  if (status) {
    whereClauses.push("wo.status = ?");
    params.push(status);
  }
  if (type) {
    whereClauses.push("wo.type = ?");
    params.push(type);
  }
  if (client_id) {
    whereClauses.push("wo.client_id = ?");
    params.push(client_id);
  }
  if (creator_id) {
    whereClauses.push("wo.created_by = ?");
    params.push(creator_id);
  }
  if (date_from) {
    whereClauses.push("wo.date >= ?");
    params.push(date_from);
  }
  if (date_to) {
    whereClauses.push("wo.date <= ?");
    params.push(date_to);
  }
  if (authorized !== undefined) {
    whereClauses.push("wo.authorized = ?");
    params.push(authorized === "true" ? 1 : 0);
  }

  if (whereClauses.length > 0) {
    baseQuery += " WHERE " + whereClauses.join(" AND ");
  }

  if (facturada !== undefined) {
    const havingClause =
      facturada === "true" ? "HAVING facturada = 1" : "HAVING facturada = 0";
    baseQuery += ` ${havingClause}`;
  }

  baseQuery += " ORDER BY wo.created_at DESC";

  try {
    const workOrders = db.prepare(baseQuery).all(params);
    res.json(workOrders);
  } catch (error) {
    console.error("Error fetching work orders:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// Obtener una orden de trabajo por ID
router.get("/:id", (req, res) => {
  try {
    const workOrder = db
      .prepare(
        `
      SELECT 
        wo.*, 
        c.name as client_name, 
        u.name as creator_name,
        con.name as contact_name
      FROM work_orders wo
      JOIN clients c ON wo.client_id = c.id
      JOIN users u ON wo.created_by = u.id
      LEFT JOIN contacts con ON wo.contact_id = con.id
      WHERE wo.id = ?
    `
      )
      .get(req.params.id);

    if (workOrder) {
      const activities = db
        .prepare(
          `
        SELECT 
          wa.*, 
          GROUP_CONCAT(u.name) as assigned_users_names
        FROM work_order_activities wa
        LEFT JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        LEFT JOIN users u ON waa.user_id = u.id
        WHERE wa.work_order_id = ?
        GROUP BY wa.id
      `
        )
        .all(req.params.id);
      (workOrder as any).activities = activities;
      res.json(workOrder);
    } else {
      res.status(404).json({ message: "Orden de trabajo no encontrada" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error al obtener la orden de trabajo" });
  }
});

// Crear una nueva orden de trabajo
router.post("/", (req, res) => {
  const {
    date,
    type,
    client_id,
    contact_id,
    product,
    brand,
    model,
    seal_number,
    observations,
    certificate_expiry,
    estimated_delivery_date,
    created_by,
    activities,
    disposition,
    authorized,
    contract_type,
    moneda,
  } = req.body;

  if (!date || !type || !client_id || !product || !created_by || !activities) {
    return res.status(400).json({ message: "Faltan campos obligatorios" });
  }

  const transaction = db.transaction(() => {
    const year = new Date().getFullYear();
    const lastOT = db
      .prepare(
        "SELECT custom_id FROM work_orders WHERE custom_id LIKE ? ORDER BY custom_id DESC LIMIT 1"
      )
      .get(`${year}-%`);

    let nextId = 1;
    if (lastOT) {
      const lastIdNumber = parseInt(
        (lastOT as { custom_id: string }).custom_id.split("-")[1],
        10
      );
      nextId = lastIdNumber + 1;
    }
    const customId = `${year}-${String(nextId).padStart(4, "0")}`;

    const stmt = db.prepare(
      `INSERT INTO work_orders 
        (custom_id, date, type, client_id, contact_id, product, brand, model, seal_number, observations, certificate_expiry, estimated_delivery_date, created_by, disposition, authorized, contract_type, moneda) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const info = stmt.run(
      customId,
      date,
      type,
      client_id,
      contact_id,
      product,
      brand,
      model,
      seal_number,
      observations,
      certificate_expiry,
      estimated_delivery_date,
      created_by,
      disposition,
      authorized ? 1 : 0,
      contract_type,
      moneda || "ARS"
    );
    const workOrderId = info.lastInsertRowid;

    const activityStmt = db.prepare(
      "INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva) VALUES (?, ?, ?, ?)"
    );
    for (const activity of activities) {
      activityStmt.run(
        workOrderId,
        activity.activity,
        activity.norma,
        activity.precio_sin_iva
      );
    }

    const directorAndAdminUsers = db
      .prepare(
        "SELECT id FROM users WHERE role = 'director' OR role = 'administrador'"
      )
      .all();
    const notificationStmt = db.prepare(
      "INSERT INTO notifications (user_id, message, ot_id) VALUES (?, ?, ?)"
    );

    for (const user of directorAndAdminUsers as { id: number }[]) {
      if (user.id !== created_by) {
        notificationStmt.run(
          user.id,
          `Se ha creado una nueva OT (${customId}) y requiere tu autorización.`,
          workOrderId
        );
      }
    }

    // --- CORRECCIÓN 1: Se usa 'sendToAll' en lugar de 'send' ---
    sseService.sendToAll({
      type: "ot_created",
      message: `Nueva OT ${customId} creada.`,
      ot_id: workOrderId,
    });

    return { id: workOrderId, custom_id: customId };
  });

  try {
    const result = transaction();
    res.status(201).json(result);
  } catch (err: any) {
    console.error("Error in transaction:", err);
    res.status(500).json({ message: err.message });
  }
});

// Actualizar una orden de trabajo
router.patch("/:id", (req, res) => {
  const { activities, ...otFields } = req.body;
  const workOrderId = req.params.id;

  const transaction = db.transaction(() => {
    if (Object.keys(otFields).length > 0) {
      const setClause = Object.keys(otFields)
        .map((key) => `${key} = ?`)
        .join(", ");
      const params = [...Object.values(otFields), workOrderId];
      db.prepare(`UPDATE work_orders SET ${setClause} WHERE id = ?`).run(
        params
      );
    }

    if (activities) {
      db.prepare(
        "DELETE FROM work_order_activities WHERE work_order_id = ?"
      ).run(workOrderId);
      const activityStmt = db.prepare(
        "INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva, status) VALUES (?, ?, ?, ?, ?)"
      );
      const assignStmt = db.prepare(
        "INSERT INTO work_order_activity_assignments (activity_id, user_id) VALUES (?, ?)"
      );
      for (const act of activities) {
        const info = activityStmt.run(
          workOrderId,
          act.activity,
          act.norma,
          act.precio_sin_iva,
          act.status || "pendiente"
        );
        const activityId = info.lastInsertRowid;
        if (act.assigned_users && act.assigned_users.length > 0) {
          for (const userId of act.assigned_users) {
            assignStmt.run(activityId, userId);
          }
        }
      }
    }

    const updatedOT = db
      .prepare("SELECT custom_id, created_by FROM work_orders WHERE id = ?")
      .get(workOrderId) as { custom_id: string; created_by: number };

    if (otFields.authorized === true) {
      const message = `La OT ${updatedOT.custom_id} ha sido autorizada.`;
      const notificationStmt = db.prepare(
        "INSERT INTO notifications (user_id, message, ot_id) VALUES (?, ?, ?)"
      );
      notificationStmt.run(updatedOT.created_by, message, workOrderId);

      // --- CORRECCIÓN 2: Se usa 'sendToUser' en lugar de 'send' ---
      sseService.sendToUser(updatedOT.created_by, {
        type: "ot_authorized",
        message,
        ot_id: workOrderId,
      });
    }

    return db
      .prepare("SELECT * FROM work_orders WHERE id = ?")
      .get(workOrderId);
  });

  try {
    const updatedWorkOrder = transaction();
    res.json(updatedWorkOrder);
  } catch (error: any) {
    console.error("Error updating work order:", error);
    res
      .status(500)
      .json({ error: "Error interno al actualizar la orden de trabajo." });
  }
});

export default router;
