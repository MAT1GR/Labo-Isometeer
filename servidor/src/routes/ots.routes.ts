// RUTA: /servidor/src/routes/ots.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";

const router = Router();

// --- Helper function to generate custom OT ID ---
const generateCustomId = (
  date: string,
  type: string,
  client_id: string | number
): string => {
  const client = db
    .prepare("SELECT code FROM clients WHERE id = ?")
    .get(client_id) as { code: string };
  if (!client) throw new Error("Cliente inválido para generar ID");

  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = yearStr.slice(-2);
  const datePrefix = `${year}${monthStr}${dayStr}`;

  const otsOfTheDay = db
    .prepare("SELECT custom_id FROM work_orders WHERE date = ?")
    .all(date) as { custom_id: string }[];

  let maxSequential = 0;
  for (const ot of otsOfTheDay) {
    if (ot.custom_id && ot.custom_id.startsWith(datePrefix)) {
      const idWithoutPrefix = ot.custom_id.substring(datePrefix.length);
      const sequentialMatch = idWithoutPrefix.match(/^(\d+)/);
      if (sequentialMatch && sequentialMatch[1]) {
        const currentSequential = parseInt(sequentialMatch[1], 10);
        if (currentSequential > maxSequential) {
          maxSequential = currentSequential;
        }
      }
    }
  }

  const sequentialNumber = maxSequential + 1;

  const typeInitials: { [key: string]: string } = {
    Produccion: "P",
    Calibracion: "C",
    "Ensayo SE": "S",
    "Ensayo EE": "E",
    "Otros Servicios": "O",
  };
  const typeInitial = typeInitials[type as string] || "?";

  return `${datePrefix}${sequentialNumber} ${typeInitial} ${client.code}`;
};

// --- RUTA: [GET] /api/ots ---
router.get("/", (req: Request, res: Response) => {
  const {
    role,
    assigned_to,
    searchTerm,
    clientId,
    assignedToId,
    status,
    authorized,
  } = req.query;

  try {
    let query = `
      SELECT
        ot.id, ot.custom_id, ot.product, ot.status, ot.authorized,
        c.name as client_name,
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

    if (role === "empleado" && assigned_to) {
      whereClauses.push(
        `ot.id IN (SELECT work_order_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE waa.user_id = ?) AND ot.authorized = 1`
      );
      params.push(assigned_to);
    } else {
      // Aplicar filtros solo para vistas de admin/director
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
          `ot.id IN (SELECT work_order_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE waa.user_id = ?)`
        );
        params.push(assignedToId);
      }
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += " GROUP BY ot.id ORDER BY ot.created_at DESC";

    const ots = db.prepare(query).all(params);
    res.status(200).json(ots);
  } catch (error) {
    console.error("Error en GET /ots:", error);
    res.status(500).json({ error: "Error al obtener las órdenes de trabajo." });
  }
});

// --- RUTA generate-id (DEBE IR ANTES DE /:id) ---
router.get("/generate-id", (req: Request, res: Response) => {
  try {
    const { date, type, client_id } = req.query;
    if (!date || !type || !client_id)
      return res.status(200).json({ previewId: "Completar campos..." });

    const custom_id = generateCustomId(
      date as string,
      type as string,
      client_id as string
    );
    res.status(200).json({ previewId: custom_id });
  } catch (error: any) {
    console.error("Error al generar ID:", error);
    res
      .status(500)
      .json({ error: "Error al generar el ID", details: error.message });
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
      seal_number, observations, certificate_expiry, collaborator_observations, created_by, status,
      quotation_amount, quotation_details, disposition, contract_type
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertActivityStmt = db.prepare(
    "INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva) VALUES (?, ?, ?, ?)"
  );
  const insertAssignmentStmt = db.prepare(
    "INSERT INTO work_order_activity_assignments (activity_id, user_id) VALUES (?, ?)"
  );

  const createTransaction = db.transaction((data) => {
    const final_custom_id = generateCustomId(
      data.otData.date,
      data.otData.type,
      data.otData.client_id
    );

    const info = insertOTStmt.run(
      final_custom_id,
      data.otData.date,
      data.otData.type,
      data.otData.client_id,
      data.otData.product,
      data.otData.brand,
      data.otData.model,
      data.otData.seal_number,
      data.otData.observations,
      data.otData.certificate_expiry,
      data.otData.collaborator_observations,
      data.created_by,
      "pendiente",
      data.otData.quotation_amount,
      data.otData.quotation_details,
      data.otData.disposition,
      data.otData.contract_type
    );
    const otId = info.lastInsertRowid;
    for (const act of data.activities) {
      if (act.activity) {
        const activityInfo = insertActivityStmt.run(
          otId,
          act.activity,
          act.norma,
          act.precio_sin_iva
        );
        const activityId = activityInfo.lastInsertRowid;
        if (act.assigned_to && Array.isArray(act.assigned_to)) {
          for (const userId of act.assigned_to) {
            insertAssignmentStmt.run(activityId, userId);
            const points = getPointsForActivity(act.activity);
            if (points > 0) {
              db.prepare(
                "UPDATE users SET points = points + ? WHERE id = ?"
              ).run(points, userId);
            }
          }
        }
      }
    }
    return { id: otId };
  });
  try {
    const result = createTransaction({ otData, activities, created_by });
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
});

// [GET] /api/ots/:id
router.get("/:id", (req: Request, res: Response) => {
  try {
    const ot: any = db
      .prepare(`SELECT * FROM work_orders WHERE id = ?`)
      .get(req.params.id);

    if (ot) {
      // Adjuntar datos completos del cliente
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
    `UPDATE work_orders SET date=?, type=?, product=?, brand=?, model=?, seal_number=?, observations=?, certificate_expiry=?, status=?, quotation_amount=?, quotation_details=?, disposition=?, contract_type=?, collaborator_observations=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
  );
  const deleteActivitiesStmt = db.prepare(
    "DELETE FROM work_order_activities WHERE work_order_id = ?"
  );
  const insertActivityStmt = db.prepare(
    "INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva) VALUES (?, ?, ?, ?)"
  );
  const insertAssignmentStmt = db.prepare(
    "INSERT INTO work_order_activity_assignments (activity_id, user_id) VALUES (?, ?)"
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
      otData.contract_type,
      otData.collaborator_observations,
      id
    );
    deleteActivitiesStmt.run(id); // Esto eliminará en cascada las asignaciones
    for (const act of activities) {
      if (act.activity) {
        const activityInfo = insertActivityStmt.run(
          id,
          act.activity,
          act.norma,
          act.precio_sin_iva
        );
        const activityId = activityInfo.lastInsertRowid;
        if (act.assigned_to && Array.isArray(act.assigned_to)) {
          for (const userId of act.assigned_to) {
            insertAssignmentStmt.run(activityId, userId);
          }
        }
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

router.put("/:id/deauthorize", (req, res) => {
  try {
    const info = db
      .prepare(
        "UPDATE work_orders SET authorized = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pendiente'"
      )
      .run(req.params.id);

    if (info.changes === 0) {
      return res.status(404).json({
        error:
          "OT no encontrada o no se puede desautorizar porque no está en progreso o finalizada.",
      });
    }

    res.status(200).json({ message: "OT desautorizada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al desautorizar la OT." });
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
  const { activityId } = req.params;
  const startTransaction = db.transaction(() => {
    const activity = db
      .prepare(
        "SELECT work_order_id FROM work_order_activities WHERE id = ? AND status = 'pendiente'"
      )
      .get(activityId) as { work_order_id: number } | undefined;

    if (!activity) {
      throw new Error("La actividad ya fue iniciada o no se encontró.");
    }

    db.prepare(
      "UPDATE work_order_activities SET status = 'en_progreso', started_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(activityId);

    db.prepare(
      "UPDATE work_orders SET status = 'en_progreso' WHERE id = ? AND status = 'pendiente'"
    ).run(activity.work_order_id);
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

// [GET] /api/ots/user-summary/:userId
router.get("/user-summary/:userId", (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const summary = db
      .prepare(
        `
        SELECT
            ot.id,
            ot.custom_id,
            ot.product,
            c.name as client_name,
            ot.date as ot_date,
            wa.activity,
            wa.status
        FROM work_order_activities wa
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        JOIN work_orders ot ON wa.work_order_id = ot.id
        JOIN clients c ON ot.client_id = c.id
        WHERE
            waa.user_id = ?
            AND ot.status NOT IN ('facturada', 'cierre')
            AND ot.authorized = 1
        ORDER BY
            CASE wa.status
                WHEN 'en_progreso' THEN 1
                WHEN 'pendiente' THEN 2
                WHEN 'finalizada' THEN 3
            END,
            ot.date DESC
    `
      )
      .all(userId);

    res.status(200).json(summary);
  } catch (error) {
    console.error("Error fetching user summary data:", error);
    res.status(500).json({ error: "Error al obtener el resumen del usuario." });
  }
});

export default router;
