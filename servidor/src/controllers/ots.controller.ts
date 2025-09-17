// RUTA: servidor/src/controllers/ots.controller.ts

import { Request, Response } from "express";
import db from "../config/database";
import { Statement } from "better-sqlite3";
import * as otService from "../services/ots.services";
import {
  addHistoryEntry,
  createAndSendNotification,
  generateCustomId,
} from "../helpers/ots.helpers";

// --- CONTROLADORES GET ---

export const generateIdHandler = (req: Request, res: Response) => {
  const { date, type, client_id } = req.query;
  if (!date || !type || !client_id) {
    return res.status(400).json({
      error: "Faltan parámetros (date, type, client_id) para generar el ID.",
    });
  }
  try {
    const customId = generateCustomId(
      date as string,
      type as string,
      client_id as string
    );
    res.status(200).json({ custom_id: customId });
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
};

export const getMisOts = (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: "Falta el ID de usuario en la URL." });
  }
  try {
    const query = `
      SELECT
        ot.id, ot.custom_id, ot.product as title, ot.status, ot.authorized,
        c.name as client_name,
        ot.client_id,
        (SELECT GROUP_CONCAT(DISTINCT u.name)
         FROM work_order_activities wa
         JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
         JOIN users u ON waa.user_id = u.id
         WHERE wa.work_order_id = ot.id) as assigned_to_name
      FROM work_orders ot
      LEFT JOIN clients c ON ot.client_id = c.id
      WHERE ot.id IN (
        SELECT DISTINCT wa.work_order_id
        FROM work_order_activities wa
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        WHERE waa.user_id = ?
      ) AND ot.authorized = 1
      GROUP BY ot.id
      ORDER BY ot.created_at DESC
    `;
    const stmt: Statement = db.prepare(query);
    const ots = stmt.all(userId);
    res.status(200).json(ots);
  } catch (error) {
    console.error("Error en GET /ots/asignadas:", error);
    res.status(500).json({ error: "Error al obtener mis órdenes de trabajo." });
  }
};

export const getAllOts = (req: Request, res: Response) => {
  const {
    role,
    user_id,
    searchTerm,
    clientId,
    assignedToId,
    status,
    authorized,
  } = req.query;
  try {
    let query = `
      SELECT
        ot.id, ot.custom_id, ot.product as title, ot.status, ot.authorized,
        c.name as client_name,
        ot.client_id,
        (SELECT GROUP_CONCAT(DISTINCT u.name)
         FROM work_order_activities wa
         JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
         JOIN users u ON waa.user_id = u.id
         WHERE wa.work_order_id = ot.id) as assigned_to_name
      FROM work_orders ot
      LEFT JOIN clients c ON ot.client_id = c.id
    `;
    const params: any[] = [];
    const whereClauses: string[] = [];

    if (role === "empleado" && user_id) {
      whereClauses.push(
        `ot.id IN (SELECT DISTINCT wa.work_order_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE waa.user_id = ?) AND ot.authorized = 1`
      );
      params.push(user_id);
    } else {
      if (searchTerm) {
        whereClauses.push(`(ot.custom_id LIKE ? OR ot.product LIKE ?)`);
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }
      if (clientId) {
        whereClauses.push(`ot.client_id = ?`);
        params.push(clientId);
      }
      if (status) {
        whereClauses.push(`ot.status = ?`);
        params.push(status);
      }
      if (authorized === "true" || authorized === "false") {
        whereClauses.push(`ot.authorized = ?`);
        params.push(authorized === "true" ? 1 : 0);
      }
      if (assignedToId) {
        whereClauses.push(
          `ot.id IN (SELECT DISTINCT wa.work_order_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE waa.user_id = ?)`
        );
        params.push(assignedToId);
      }
    }
    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }
    query += " GROUP BY ot.id ORDER BY ot.created_at DESC";
    const stmt: Statement = db.prepare(query);
    const ots = stmt.all(params);
    res.status(200).json(ots);
  } catch (error) {
    console.error("Error en GET /ots:", error);
    res.status(500).json({ error: "Error al obtener las órdenes de trabajo." });
  }
};

export const getOtById = (req: Request, res: Response) => {
  try {
    const ot: any = db
      .prepare(`SELECT * FROM work_orders WHERE id = ?`)
      .get(req.params.id);
    if (ot) {
      const client = db
        .prepare("SELECT * FROM clients WHERE id = ?")
        .get(ot.client_id);
      if (client) {
        const contacts = db
          .prepare("SELECT * FROM contacts WHERE client_id = ?")
          .all(ot.client_id);
        ot.client = { ...client, contacts };
      }
      const activities = db
        .prepare(
          `SELECT wa.id, wa.activity, wa.norma, wa.precio_sin_iva, wa.status, wa.started_at, wa.completed_at,
           json_group_array(json_object('id', u.id, 'name', u.name)) as assigned_users
           FROM work_order_activities wa
           LEFT JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
           LEFT JOIN users u ON waa.user_id = u.id
           WHERE wa.work_order_id = ?
           GROUP BY wa.id`
        )
        .all(req.params.id)
        .map((act: any) => ({
          ...act,
          assigned_users: JSON.parse(act.assigned_users).filter(
            (u: any) => u.id !== null
          ),
        }));
      const facturas = db
        .prepare(
          `SELECT f.id, f.numero_factura, f.monto 
           FROM facturas f
           JOIN factura_ots fo ON f.id = fo.factura_id
           WHERE fo.ot_id = ?`
        )
        .all(req.params.id);
      res.status(200).json({
        ...ot,
        activities,
        facturas,
        factura_ids: facturas.map((f: any) => f.id),
      });
    } else {
      res.status(404).json({ error: "OT no encontrada." });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al obtener la OT." });
  }
};

export const getOtHistory = (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const history = db
      .prepare(
        "SELECT h.*, u.name as username FROM ot_history h LEFT JOIN users u ON u.id = h.user_id WHERE h.ot_id = ? ORDER BY h.changed_at DESC"
      )
      .all(id);
    res.json(history);
  } catch (error) {
    console.error("Error al obtener historial:", error);
    res.status(500).json({ error: "Error interno al obtener el historial." });
  }
};

export const getUserSummary = (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const summary = db
      .prepare(
        `
            SELECT ot.id, ot.custom_id, ot.product, c.name as client_name, ot.date as ot_date, wa.activity, wa.status
            FROM work_order_activities wa
            JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
            JOIN work_orders ot ON wa.work_order_id = ot.id
            JOIN clients c ON ot.client_id = c.id
            WHERE waa.user_id = ? AND ot.status NOT IN ('facturada', 'cierre', 'cerrada') AND ot.authorized = 1
            ORDER BY CASE wa.status WHEN 'en_progreso' THEN 1 WHEN 'pendiente' THEN 2 WHEN 'finalizada' THEN 3 END, ot.date DESC
        `
      )
      .all(userId);
    res.status(200).json(summary);
  } catch (error) {
    console.error("Error fetching user summary data:", error);
    res.status(500).json({ error: "Error al obtener el resumen del usuario." });
  }
};

export const getOtsByClient = (req: Request, res: Response) => {
  try {
    const ots = db
      .prepare(
        `SELECT id, custom_id, product, status FROM work_orders WHERE client_id = ? AND status != 'facturada'`
      )
      .all(req.params.id);
    res.json(ots);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las órdenes de trabajo." });
  }
};

// --- CONTROLADOR POST ---
export const createOt = (req: Request, res: Response) => {
  try {
    const { created_by } = req.body;
    const creator: { role: string } | undefined = db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(created_by) as any;
    if (
      !creator ||
      !["administrador", "administracion", "director"].includes(creator.role)
    ) {
      return res
        .status(403)
        .json({ error: "No tienes permisos para crear una OT." });
    }
    const result = otService.createNewOt(req.body);
    res.status(201).json(result);
  } catch (error: any) {
    console.error("Error al crear OT:", error);
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error:
          "Error de concurrencia: El ID de OT generado ya existe. Inténtelo de nuevo.",
      });
    }
    res.status(500).json({ error: error.message || "Error al crear la OT." });
  }
};

// --- CONTROLADORES PUT ---
export const updateOt = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, user_id, ...otData } = req.body;
    if (!user_id)
      return res.status(400).json({ error: "Falta el ID del usuario." });

    const user: { role: string } | undefined = db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(user_id) as any;
    if (!user) return res.status(403).json({ error: "Usuario no encontrado." });

    if (role === "empleado") {
      db.prepare(
        "UPDATE work_orders SET collaborator_observations = ? WHERE id = ?"
      ).run(otData.collaborator_observations, id);
      return res.status(200).json({ message: "Observaciones guardadas." });
    }
    if (!["administrador", "administracion", "director"].includes(user.role)) {
      return res
        .status(403)
        .json({ error: "No tienes permisos para editar esta OT." });
    }
    otService.updateExistingOt(id, req.body);
    res.status(200).json({ message: "OT actualizada con éxito." });
  } catch (error: any) {
    console.error("Error al actualizar OT:", error);
    res
      .status(error.message === "OT no encontrada" ? 404 : 500)
      .json({ error: error.message });
  }
};

export const authorizeOt = (req: Request, res: Response) => {
  const { userId } = req.body;
  const otId = parseInt(req.params.id);
  if (!userId) return res.status(400).json({ error: "userId es requerido." });

  const authorizer: { role: string } | undefined = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(userId) as any;
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
        "UPDATE work_orders SET authorized = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND authorized = 0"
      )
      .run(otId);
    if (info.changes > 0) {
      addHistoryEntry(otId, userId, ["La OT fue autorizada."]);
      const ot: { custom_id: string } | undefined = db
        .prepare("SELECT custom_id FROM work_orders WHERE id = ?")
        .get(otId) as any;
      const assignedUsers: { user_id: number }[] = db
        .prepare(
          `SELECT DISTINCT waa.user_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE wa.work_order_id = ?`
        )
        .all(otId) as any;
      if (ot && assignedUsers.length > 0) {
        const message = `La OT #${ot.custom_id} fue autorizada y tienes tareas asignadas.`;
        for (const user of assignedUsers) {
          createAndSendNotification(user.user_id, message, otId);
        }
      }
    } else {
      return res
        .status(404)
        .json({ error: "OT no encontrada o ya estaba autorizada." });
    }
    const updatedOT = db
      .prepare("SELECT * FROM work_orders WHERE id = ?")
      .get(otId);
    res.status(200).json(updatedOT);
  } catch (error) {
    res.status(500).json({ error: "Error al autorizar la OT." });
  }
};

export const deauthorizeOt = (req: Request, res: Response) => {
  const otId = parseInt(req.params.id);
  const { userId } = req.body;
  try {
    const info = db
      .prepare(
        "UPDATE work_orders SET authorized = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(otId);
    if (info.changes === 0) {
      return res
        .status(404)
        .json({ error: "OT no encontrada o ya estaba desautorizada." });
    }
    if (userId)
      addHistoryEntry(otId, userId, ["La autorización de la OT fue revocada."]);
    res.status(200).json({ message: "OT desautorizada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al desautorizar la OT." });
  }
};

export const closeOt = (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId es requerido." });

  const closer: { role: string } | undefined = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(userId) as any;
  if (!closer || closer.role !== "director") {
    return res
      .status(403)
      .json({ error: "Solo un director puede cerrar OTs." });
  }
  const ot: any = db.prepare("SELECT * FROM work_orders WHERE id = ?").get(id);
  if (!ot) return res.status(404).json({ error: "OT no encontrada." });
  if (ot.status !== "finalizada")
    return res.status(400).json({
      error: "La OT debe estar en estado 'finalizada' para poder cerrarse.",
    });

  const getPointsForActivity = (activity: string): number => {
    const row: { points: number } | undefined = db
      .prepare("SELECT points FROM activity_points WHERE activity = ?")
      .get(activity) as any;
    return row ? row.points : 0;
  };
  const closeTransaction = db.transaction(() => {
    db.prepare(
      "UPDATE work_orders SET status = 'cerrada', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(id);
    addHistoryEntry(parseInt(id), userId, [
      "La OT fue cerrada y los puntos fueron asignados.",
    ]);
    const activities: { activity: string; user_id: number }[] = db
      .prepare(
        `SELECT wa.activity, waa.user_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE wa.work_order_id = ?`
      )
      .all(id) as any;
    const pointsToAward: { [key: number]: number } = {};
    for (const act of activities) {
      const points = getPointsForActivity(act.activity);
      if (points > 0 && act.user_id) {
        pointsToAward[act.user_id] = (pointsToAward[act.user_id] || 0) + points;
        createAndSendNotification(
          act.user_id,
          `Has ganado ${points} puntos por la actividad "${act.activity}" en la OT #${ot.custom_id}.`,
          ot.id
        );
      }
    }
    for (const userId in pointsToAward) {
      db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(
        pointsToAward[userId],
        userId
      );
    }
    return db.prepare("SELECT * FROM work_orders WHERE id = ?").get(id);
  });
  try {
    const updatedOT = closeTransaction();
    res.status(200).json(updatedOT);
  } catch (error) {
    console.error("Error closing OT:", error);
    res.status(500).json({ error: "Error al cerrar la OT." });
  }
};

export const startActivity = (req: Request, res: Response) => {
  const { activityId } = req.params;
  const { userId } = req.body;
  const startTransaction = db.transaction(() => {
    const activity: any = db
      .prepare(
        "SELECT work_order_id, activity FROM work_order_activities WHERE id = ? AND status = 'pendiente'"
      )
      .get(activityId);
    if (!activity)
      throw new Error("La actividad ya fue iniciada o no se encontró.");
    db.prepare(
      "UPDATE work_order_activities SET status = 'en_progreso', started_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
    ).run(activityId);
    if (userId)
      addHistoryEntry(activity.work_order_id, userId, [
        `Se inició la actividad: "${activity.activity}".`,
      ]);
    const info = db
      .prepare(
        "UPDATE work_orders SET status = 'en_progreso' WHERE id = ? AND status = 'pendiente'"
      )
      .run(activity.work_order_id);
    if (info.changes > 0) {
      const ot: { created_by: number; custom_id: string } | undefined = db
        .prepare("SELECT created_by, custom_id FROM work_orders WHERE id = ?")
        .get(activity.work_order_id) as any;
      if (ot)
        createAndSendNotification(
          ot.created_by,
          `La OT #${ot.custom_id} ha comenzado.`,
          activity.work_order_id
        );
    }
  });
  try {
    startTransaction();
    res.status(200).json({ message: "Actividad iniciada." });
  } catch (error: any) {
    if (error.message.includes("iniciada o no se encontró")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Error al iniciar la actividad." });
  }
};

export const stopActivity = (req: Request, res: Response) => {
  const { activityId } = req.params;
  const { userId } = req.body;
  const stopTransaction = db.transaction(() => {
    const activity: any = db
      .prepare(
        "SELECT work_order_id, activity FROM work_order_activities WHERE id = ? AND status = 'en_progreso'"
      )
      .get(activityId);
    if (!activity)
      throw new Error("La actividad no está en progreso o no existe.");
    db.prepare(
      "UPDATE work_order_activities SET status = 'finalizada', completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
    ).run(activityId);
    if (userId)
      addHistoryEntry(activity.work_order_id, userId, [
        `Se finalizó la actividad: "${activity.activity}".`,
      ]);
    const otId = activity.work_order_id;
    const pendingActivities: { count: number } = db
      .prepare(
        "SELECT COUNT(*) as count FROM work_order_activities WHERE work_order_id = ? AND status != 'finalizada'"
      )
      .get(otId) as any;
    if (pendingActivities.count === 0) {
      db.prepare(
        "UPDATE work_orders SET status = 'finalizada' WHERE id = ?"
      ).run(otId);
      const ot: { created_by: number; custom_id: string } | undefined = db
        .prepare("SELECT created_by, custom_id FROM work_orders WHERE id = ?")
        .get(otId) as any;
      if (ot)
        createAndSendNotification(
          ot.created_by,
          `Todas las actividades de la OT #${ot.custom_id} han finalizado.`,
          otId
        );
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
};

// --- CONTROLADOR DELETE ---
export const deleteOt = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const info = db.prepare("DELETE FROM work_orders WHERE id = ?").run(id);
    if (info.changes === 0)
      return res.status(404).json({ error: "Orden de Trabajo no encontrada." });
    res.status(200).json({ message: "Orden de Trabajo eliminada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
};
export function addActivityToOt(arg0: string, arg1: any, addActivityToOt: any) {
  throw new Error("Function not implemented.");
}

export function updateActivity(arg0: string, arg1: any, updateActivity: any) {
  throw new Error("Function not implemented.");
}

export function getOts(arg0: string, arg1: any, getOts: any) {
  throw new Error("Function not implemented.");
}

export function getOtsByUser(arg0: string, arg1: any, getOtsByUser: any) {
  throw new Error("Function not implemented.");
}

export function deleteActivity(arg0: string, arg1: any, deleteActivity: any) {
  throw new Error("Function not implemented.");
}
