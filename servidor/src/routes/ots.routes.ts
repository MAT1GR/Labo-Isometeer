// RUTA: /servidor/src/routes/ots.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";
import { sendNotificationToUser } from "./notifications.routes";

const router = Router();

/**
 * Función unificada para crear una notificación en la base de datos y
 * enviarla en tiempo real a un usuario específico a través de SSE.
 * @param userId - ID del usuario que recibirá la notificación.
 * @param message - Mensaje de la notificación.
 * @param otId - ID de la Orden de Trabajo relacionada.
 */
const createAndSendNotification = (
  userId: number,
  message: string,
  otId: number
) => {
  try {
    // 1. Insertar la notificación en la base de datos
    const stmt = db.prepare(
      "INSERT INTO notifications (user_id, message, ot_id) VALUES (?, ?, ?)"
    );
    const info = stmt.run(userId, message, otId);
    const notificationId = info.lastInsertRowid;

    // 2. Obtener la notificación recién creada para enviarla completa
    const newNotification = db
      .prepare("SELECT * FROM notifications WHERE id = ?")
      .get(notificationId);

    // 3. Enviar por SSE al cliente conectado
    if (newNotification) {
      sendNotificationToUser(userId, newNotification);
    }
  } catch (error) {
    console.error("Error al crear o enviar notificación:", error);
  }
};

/**
 * Genera un ID de OT personalizado basado en la fecha, tipo y cliente.
 * @param date - Fecha de la OT (YYYY-MM-DD).
 * @param type - Tipo de OT (e.g., 'Produccion', 'Calibracion').
 * @param client_id - ID del cliente.
 * @returns Un string con el ID personalizado.
 */
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
      custom_id, date, type, client_id, contact_id, product, brand, model,
      seal_number, observations, certificate_expiry, estimated_delivery_date, collaborator_observations, created_by, status,
      quotation_amount, quotation_details, disposition, contract_type
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      data.otData.contact_id,
      data.otData.product,
      data.otData.brand,
      data.otData.model,
      data.otData.seal_number,
      data.otData.observations,
      data.otData.certificate_expiry,
      data.otData.estimated_delivery_date,
      data.otData.collaborator_observations,
      data.created_by,
      "pendiente", // <- Status inicial
      data.otData.quotation_amount,
      data.otData.quotation_details,
      data.otData.disposition,
      data.otData.contract_type
    );
    const otId = info.lastInsertRowid as number;
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
            // La notificación ahora se envía al autorizar la OT.
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

  // --- OBTENER DATOS ANTIGUOS ---
  const oldOT = db
    .prepare(
      "SELECT collaborator_observations, authorized FROM work_orders WHERE id = ?"
    )
    .get(id) as { collaborator_observations: string; authorized: number };
  if (!oldOT) {
    return res.status(404).json({ error: "OT no encontrada" });
  }
  const isAuthorized = oldOT.authorized === 1;

  const oldAssignmentsStmt = db.prepare(`
     SELECT waa.activity_id, waa.user_id
     FROM work_order_activity_assignments waa
     JOIN work_order_activities wa ON waa.activity_id = wa.id
     WHERE wa.work_order_id = ?
  `);
  const oldAssignments = new Set(
    oldAssignmentsStmt.all(id).map((a: any) => `${a.activity_id}-${a.user_id}`)
  );

  if (role === "empleado") {
    const info = db
      .prepare(
        "UPDATE work_orders SET collaborator_observations = ? WHERE id = ?"
      )
      .run(otData.collaborator_observations, id);
    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada" });

    // Notificar Menciones en Observaciones (Empleado)
    const newMentions = (
      otData.collaborator_observations.match(/@(\w+)/g) || []
    ).map((mention: string) => mention.substring(1));
    const oldMentions = (
      oldOT.collaborator_observations.match(/@(\w+)/g) || []
    ).map((mention: string) => mention.substring(1));

    const trulyNewMentions = newMentions.filter(
      (m: string) => !oldMentions.includes(m)
    );

    if (trulyNewMentions.length > 0) {
      const users = db
        .prepare(
          `SELECT id, name FROM users WHERE name IN (${trulyNewMentions
            .map(() => "?")
            .join(",")})`
        )
        .all(trulyNewMentions);
      for (const mentionedUser of users as { id: number; name: string }[]) {
        const message = `${req.body.userName} te mencionó en la OT #${otData.custom_id}.`;
        createAndSendNotification(mentionedUser.id, message, parseInt(id));
      }
    }
    return res.status(200).json({ message: "Observaciones guardadas." });
  }

  const updateStmt = db.prepare(
    `UPDATE work_orders SET date=?, type=?, product=?, brand=?, model=?, seal_number=?, observations=?, certificate_expiry=?, estimated_delivery_date=?, status=?, quotation_amount=?, quotation_details=?, disposition=?, contract_type=?, collaborator_observations=?, contact_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
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
      otData.estimated_delivery_date,
      otData.status,
      otData.quotation_amount,
      otData.quotation_details,
      otData.disposition,
      otData.contract_type,
      otData.collaborator_observations,
      otData.contact_id,
      id
    );
    deleteActivitiesStmt.run(id); // Elimina actividades y sus asignaciones en cascada
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
            // Notificar si es una nueva asignación Y LA OT ESTÁ AUTORIZADA
            if (
              isAuthorized &&
              !oldAssignments.has(`${activityId}-${userId}`)
            ) {
              const message = `Te han asignado a la actividad "${act.activity}" en la OT #${otData.custom_id}.`;
              createAndSendNotification(userId, message, parseInt(id));
            }
          }
        }
      }
    }
    // Notificar Menciones en Observaciones (Admin/Director)
    const newMentions = (
      otData.collaborator_observations.match(/@(\w+)/g) || []
    ).map((mention: string) => mention.substring(1));
    const oldMentions = (
      oldOT.collaborator_observations.match(/@(\w+)/g) || []
    ).map((mention: string) => mention.substring(1));

    const trulyNewMentions = newMentions.filter(
      (m: string) => !oldMentions.includes(m)
    );

    if (trulyNewMentions.length > 0) {
      const users = db
        .prepare(
          `SELECT id, name FROM users WHERE name IN (${trulyNewMentions
            .map(() => "?")
            .join(",")})`
        )
        .all(trulyNewMentions);
      for (const mentionedUser of users as { id: number; name: string }[]) {
        const message = `Te mencionaron en la OT #${otData.custom_id}.`;
        createAndSendNotification(mentionedUser.id, message, parseInt(id));
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
    const otId = parseInt(req.params.id);
    const info = db
      .prepare(
        "UPDATE work_orders SET authorized = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND authorized = 0"
      )
      .run(otId);

    if (info.changes > 0) {
      // Crear Notificación para todos los asignados
      const ot = db
        .prepare("SELECT custom_id FROM work_orders WHERE id = ?")
        .get(otId) as { custom_id: string };
      const assignedUsers = db
        .prepare(
          `
        SELECT DISTINCT waa.user_id
        FROM work_order_activities wa
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        WHERE wa.work_order_id = ?
      `
        )
        .all(otId) as { user_id: number }[];

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

// --- RUTA DE CIERRE DE OT ---
router.put("/:id/close", (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId es requerido." });
  }

  const closer = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(userId) as { role: string };
  if (!closer || closer.role !== "director") {
    return res
      .status(403)
      .json({ error: "Solo un director puede cerrar OTs." });
  }

  const ot = db
    .prepare("SELECT * FROM work_orders WHERE id = ?")
    .get(id) as any;
  if (!ot) {
    return res.status(404).json({ error: "OT no encontrada." });
  }
  if (ot.status !== "finalizada") {
    return res.status(400).json({
      error: "La OT debe estar en estado 'finalizada' para poder cerrarse.",
    });
  }

  const getPointsForActivity = (activity: string): number => {
    const row = db
      .prepare("SELECT points FROM activity_points WHERE activity = ?")
      .get(activity) as { points: number } | undefined;
    return row ? row.points : 0;
  };

  const closeTransaction = db.transaction(() => {
    db.prepare(
      "UPDATE work_orders SET status = 'cerrada', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(id);

    const activities = db
      .prepare(
        `
            SELECT wa.activity, waa.user_id
            FROM work_order_activities wa
            JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
            WHERE wa.work_order_id = ?
        `
      )
      .all(id) as { activity: string; user_id: number }[];

    const pointsToAward: { [key: number]: number } = {};
    for (const act of activities) {
      const points = getPointsForActivity(act.activity);
      if (points > 0 && act.user_id) {
        pointsToAward[act.user_id] = (pointsToAward[act.user_id] || 0) + points;
        // Notificar al usuario sobre los puntos ganados
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

    const updatedOT = db
      .prepare("SELECT * FROM work_orders WHERE id = ?")
      .get(id);
    return updatedOT;
  });

  try {
    const updatedOT = closeTransaction();
    res.status(200).json(updatedOT);
  } catch (error) {
    console.error("Error closing OT:", error);
    res.status(500).json({ error: "Error al cerrar la OT." });
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

    const info = db
      .prepare(
        "UPDATE work_orders SET status = 'en_progreso' WHERE id = ? AND status = 'pendiente'"
      )
      .run(activity.work_order_id);

    // Si el estado de la OT cambió a "en progreso", notificar al creador
    if (info.changes > 0) {
      const ot = db
        .prepare("SELECT created_by, custom_id FROM work_orders WHERE id = ?")
        .get(activity.work_order_id) as {
        created_by: number;
        custom_id: string;
      };
      if (ot) {
        createAndSendNotification(
          ot.created_by,
          `La OT #${ot.custom_id} ha comenzado.`,
          activity.work_order_id
        );
      }
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
      // Notificar al creador que la OT completa ha finalizado
      const ot = db
        .prepare("SELECT created_by, custom_id FROM work_orders WHERE id = ?")
        .get(otId) as { created_by: number; custom_id: string };
      if (ot) {
        createAndSendNotification(
          ot.created_by,
          `Todas las actividades de la OT #${ot.custom_id} han finalizado.`,
          otId
        );
      }
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
            AND ot.status NOT IN ('facturada', 'cierre', 'cerrada')
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
