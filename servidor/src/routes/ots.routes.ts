// RUTA: /servidor/src/routes/ots.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";

const router = Router();

// --- RUTA: [GET] /api/ots ---
router.get("/", (req: Request, res: Response) => {
  const { role, assigned_to } = req.query;
  try {
    let query = `
      SELECT 
        ot.id, ot.custom_id, ot.product, ot.status, ot.authorized,
        c.name as client_name,
        (SELECT GROUP_CONCAT(DISTINCT u.name) 
         FROM work_order_activities wa 
         JOIN users u ON wa.assigned_to = u.id 
         WHERE wa.work_order_id = ot.id) as assigned_to_name
      FROM work_orders ot
      LEFT JOIN clients c ON ot.client_id = c.id
    `;
    const params: any[] = [];
    if (role === "empleado" && assigned_to) {
      query += ` WHERE ot.id IN (SELECT work_order_id FROM work_order_activities WHERE assigned_to = ?) AND ot.authorized = 1`;
      params.push(assigned_to);
    }
    query += " GROUP BY ot.id ORDER BY ot.created_at DESC";
    const ots = db.prepare(query).all(params);
    res.status(200).json(ots);
  } catch (error) {
    console.error("Error en GET /ots:", error);
    res.status(500).json({ error: "Error al obtener las órdenes de trabajo." });
  }
});

const getPointsForActivity = (activity: string): number => {
  const pointsMap: { [key: string]: number } = {
    Calibracion: 1,
    Completo: 1,
    Ampliado: 0.5,
    Refurbished: 0.5,
    Fabricacion: 1,
    "Verificacion de identidad": 0.1,
    Reducido: 0.2,
    "Servicio tecnico": 0.2,
    Capacitacion: 1,
  };
  return pointsMap[activity] || 0;
};

// [POST] /api/ots
router.post("/", (req: Request, res: Response) => {
  const { activities = [], created_by, ...otData } = req.body;
  const creator = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(created_by) as { role: string };
  if (!creator || creator.role === "empleado") {
    return res
      .status(403)
      .json({ error: "No tienes permisos para crear una OT." });
  }
  const insertOTStmt = db.prepare(
    `INSERT INTO work_orders (
      custom_id, date, type, client_id, product, brand, model, 
      seal_number, observations, certificate_expiry, created_by, status,
      quotation_amount, quotation_details, disposition
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertActivityStmt = db.prepare(
    "INSERT INTO work_order_activities (work_order_id, activity, assigned_to) VALUES (?, ?, ?)"
  );
  const createTransaction = db.transaction(() => {
    const info = insertOTStmt.run(
      otData.custom_id,
      otData.date,
      otData.type,
      otData.client_id,
      otData.product,
      otData.brand,
      otData.model,
      otData.seal_number,
      otData.observations,
      otData.certificate_expiry,
      created_by,
      "pendiente",
      otData.quotation_amount,
      otData.quotation_details,
      otData.disposition
    );
    const otId = info.lastInsertRowid;
    for (const act of activities) {
      if (act.activity) {
        const assignedTo = act.assigned_to ? Number(act.assigned_to) : null;
        insertActivityStmt.run(otId, act.activity, assignedTo);
        if (assignedTo) {
          const points = getPointsForActivity(act.activity);
          if (points > 0) {
            db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(
              points,
              assignedTo
            );
          }
        }
      }
    }
    return { id: otId };
  });
  try {
    const result = createTransaction();
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error al crear OT:", error);
    res.status(500).json({ error: error.message || "Error al crear la OT." });
  }
});

// [GET] /api/ots/:id
router.get("/:id", (req: Request, res: Response) => {
  try {
    const ot = db
      .prepare(
        `SELECT ot.*, c.name as client_name, c.code as client_code FROM work_orders ot JOIN clients c ON ot.client_id = c.id WHERE ot.id = ?`
      )
      .get(req.params.id);
    if (ot) {
      const activities = db
        .prepare(
          `SELECT wa.id, wa.activity, wa.assigned_to, wa.status, wa.started_at, wa.completed_at, u.name as assigned_to_name 
           FROM work_order_activities wa
           LEFT JOIN users u ON wa.assigned_to = u.id
           WHERE wa.work_order_id = ?`
        )
        .all(req.params.id);
      res.status(200).json({ ...ot, activities });
    } else {
      res.status(404).json({ error: "OT no encontrada." });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la OT." });
  }
});

// [PUT] /api/ots/:id
router.put("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { activities = [], role, ...otData } = req.body;
  if (role === "empleado") {
    const info = db
      .prepare(
        "UPDATE work_orders SET collaborator_observations = ? WHERE id = ?"
      )
      .run(otData.collaborator_observations, id);
    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada" });
    return res.status(200).json({ message: "Observaciones guardadas." });
  }
  const updateStmt = db.prepare(
    `UPDATE work_orders SET date=?, type=?, product=?, brand=?, model=?, seal_number=?, observations=?, certificate_expiry=?, status=?, quotation_amount=?, quotation_details=?, disposition=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
  );
  const deleteActivitiesStmt = db.prepare(
    "DELETE FROM work_order_activities WHERE work_order_id = ?"
  );
  const insertActivityStmt = db.prepare(
    "INSERT INTO work_order_activities (work_order_id, activity, assigned_to) VALUES (?, ?, ?)"
  );
  const updateTransaction = db.transaction(() => {
    updateStmt.run(
      otData.date,
      otData.type,
      otData.product,
      otData.brand,
      otData.model,
      otData.seal_number,
      otData.observations,
      otData.certificate_expiry,
      otData.status,
      otData.quotation_amount,
      otData.quotation_details,
      otData.disposition,
      id
    );
    deleteActivitiesStmt.run(id);
    for (const act of activities) {
      if (act.activity) {
        const assignedTo = act.assigned_to ? Number(act.assigned_to) : null;
        insertActivityStmt.run(id, act.activity, assignedTo);
      }
    }
  });
  try {
    updateTransaction();
    res.status(200).json({ message: "OT actualizada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la OT." });
  }
});

// --- RUTA generate-id RESTAURADA Y VERIFICADA ---
router.get("/generate-id", (req: Request, res: Response) => {
  try {
    const { date, type, client_id } = req.query;
    if (!date || !type || !client_id)
      return res.status(200).json({ previewId: "Completar campos..." });

    const client = db
      .prepare("SELECT code FROM clients WHERE id = ?")
      .get(client_id as string) as { code: string };
    if (!client) return res.status(200).json({ previewId: "Cliente inválido" });

    // Lógica para el número incremental (N)
    const countResult = db
      .prepare(
        `SELECT COUNT(*) as count FROM work_orders WHERE date = ? AND type = ? AND client_id = ?`
      )
      .get(date as string, type as string, client_id as string) as {
      count: number;
    };
    const sequentialNumber = (countResult.count || 0) + 1;

    const dateObj = new Date(date as string);
    const year = dateObj.getUTCFullYear().toString().slice(-2);
    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = dateObj.getUTCDate().toString().padStart(2, "0");

    const custom_id = `${year}${month}${day}${sequentialNumber} ${type} ${client.code}`;
    res.status(200).json({ previewId: custom_id });
  } catch (error) {
    res.status(500).json({ error: "Error al generar el ID" });
  }
});

// --- RUTAS DE ACCIONES DE OT ---
router.put("/:id/authorize", (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "userId es requerido." });
  }
  const authorizer = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(userId) as { role: string };
  if (
    !authorizer ||
    (authorizer.role !== "director" && authorizer.role !== "administrador")
  ) {
    return res
      .status(403)
      .json({ error: "No tienes permisos para autorizar OTs." });
  }
  try {
    const info = db
      .prepare(
        "UPDATE work_orders SET authorized = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(req.params.id);
    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada." });
    const updatedOT = db
      .prepare("SELECT * FROM work_orders WHERE id = ?")
      .get(req.params.id);
    res.status(200).json(updatedOT);
  } catch (error) {
    res.status(500).json({ error: "Error al autorizar la OT." });
  }
});

// [DELETE] /api/ots/:id
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const info = db.prepare("DELETE FROM work_orders WHERE id = ?").run(id);
    if (info.changes === 0)
      return res.status(404).json({ error: "Orden de Trabajo no encontrada." });
    res.status(200).json({ message: "Orden de Trabajo eliminada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// --- RUTAS DE ACCIONES DE ACTIVIDADES ---
router.put("/activities/:activityId/start", (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;
    const info = db
      .prepare(
        "UPDATE work_order_activities SET status = 'en_progreso', started_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pendiente'"
      )
      .run(activityId);
    if (info.changes === 0) {
      return res
        .status(400)
        .json({ error: "La actividad ya fue iniciada o no se encontró." });
    }
    res.status(200).json({ message: "Actividad iniciada." });
  } catch (error) {
    res.status(500).json({ error: "Error al iniciar la actividad." });
  }
});

router.put("/activities/:activityId/stop", (req: Request, res: Response) => {
  const { activityId } = req.params;
  const stopTransaction = db.transaction(() => {
    const activity = db
      .prepare("SELECT * FROM work_order_activities WHERE id = ?")
      .get(activityId) as any;
    if (!activity || activity.status !== "en_progreso") {
      throw new Error("La actividad no está en progreso o no existe.");
    }
    db.prepare(
      "UPDATE work_order_activities SET status = 'finalizada', completed_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(activityId);
    const otId = activity.work_order_id;
    const pendingActivities = db
      .prepare(
        "SELECT COUNT(*) as count FROM work_order_activities WHERE work_order_id = ? AND status != 'finalizada'"
      )
      .get(otId) as { count: number };
    if (pendingActivities.count === 0) {
      db.prepare(
        "UPDATE work_orders SET status = 'finalizada' WHERE id = ?"
      ).run(otId);
    }
  });
  try {
    stopTransaction();
    res.status(200).json({ message: "Actividad finalizada." });
  } catch (error: any) {
    if (error.message.includes("en progreso")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Error al finalizar la actividad." });
  }
});

export default router;
