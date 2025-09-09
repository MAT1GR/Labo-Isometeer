// RUTA: /servidor/src/routes/ots.routes.ts

import { Router, Request, Response, NextFunction } from "express";
import db from "../config/database";
import { sendNotificationToUser } from "./notifications.routes";
import { Statement } from "better-sqlite3";
import jwt from "jsonwebtoken"; // <--- IMPORTACIÓN AÑADIDA

const router = Router();

// --- MIDDLEWARE DE AUTENTICACIÓN ---
// Añadido aquí para proteger la ruta /mis-ots
interface DecodedToken {
  id: number;
  role: string;
}

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ error: "No token provided." });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    ) as DecodedToken;
    // Adjuntamos el usuario decodificado al objeto request
    // @ts-ignore
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized." });
  }
};
// --- FIN DEL MIDDLEWARE ---

// --- FUNCIÓN HELPER PARA SIMPLIFICAR Y CENTRALIZAR EL REGISTRO DE HISTORIAL ---
const addHistoryEntry = (otId: number, userId: number, changes: string[]) => {
  if (!otId || !userId || changes.length === 0) return;
  try {
    const stmt = db.prepare(
      "INSERT INTO ot_history (ot_id, user_id, changes) VALUES (?, ?, ?)"
    );
    stmt.run(otId, userId, JSON.stringify(changes));
  } catch (error) {
    console.error("Error al registrar entrada en el historial:", error);
  }
};

router.get("/generate-id", (req: Request, res: Response) => {
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
});

const createAndSendNotification = (
  userId: number,
  message: string,
  otId: number
) => {
  try {
    const stmt: Statement = db.prepare(
      "INSERT INTO notifications (user_id, message, ot_id) VALUES (?, ?, ?)"
    );
    const info = stmt.run(userId, message, otId);
    const notificationId = info.lastInsertRowid;

    const newNotification = db
      .prepare("SELECT * FROM notifications WHERE id = ?")
      .get(notificationId);

    if (newNotification) {
      sendNotificationToUser(userId, newNotification);
    }
  } catch (error) {
    console.error("Error al crear o enviar notificación:", error);
  }
};

const generateCustomId = (
  date: string,
  type: string,
  client_id: string | number
): string => {
  const client: { code: string } | undefined = db
    .prepare("SELECT code FROM clients WHERE id = ?")
    .get(client_id) as { code: string } | undefined;
  if (!client) throw new Error("Cliente inválido para generar ID");

  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = yearStr.slice(-2);
  const datePrefix = `${year}${monthStr}${dayStr}`;

  const otsOfTheDay: { custom_id: string }[] = db
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

// [GET] /api/ots/mis-ots (RUTA CORREGIDA CON MIDDLEWARE)
router.get("/mis-ots", verifyToken, (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user?.id; // Ahora req.user existe gracias al middleware

  if (!userId) {
    // Esta comprobación es redundante si verifyToken funciona, pero es una buena práctica
    return res.status(401).json({ error: "No autenticado." });
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
    console.error("Error en GET /mis-ots:", error);
    res.status(500).json({ error: "Error al obtener mis órdenes de trabajo." });
  }
});

// [GET] /api/ots
router.get("/", (req: Request, res: Response) => {
  const {
    role,
    user_id, // Se espera user_id en lugar de assigned_to
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

    // Lógica principal de filtrado
    if (role === "empleado" && user_id) {
      whereClauses.push(
        `ot.id IN (
          SELECT DISTINCT wa.work_order_id
          FROM work_order_activities wa
          JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
          WHERE waa.user_id = ?
        ) AND ot.authorized = 1`
      );
      params.push(user_id);
    } else {
      // Filtros para roles administrativos
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
          `ot.id IN (
            SELECT DISTINCT wa.work_order_id
            FROM work_order_activities wa
            JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
            WHERE waa.user_id = ?
          )`
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
});
// [POST] /api/ots
router.post("/", (req: Request, res: Response) => {
  const { activities = [], created_by, factura_ids = [], ...otData } = req.body;
  const creator: { role: string } | undefined = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(created_by) as { role: string } | undefined;
  if (
    !creator ||
    !["administrador", "administracion", "director"].includes(creator.role)
  ) {
    return res
      .status(403)
      .json({ error: "No tienes permisos para crear una OT." });
  }

  const insertOTStmt = db.prepare(
    `INSERT INTO work_orders (
    custom_id, date, type, client_id, contact_id, product, brand, model,
    seal_number, observations, certificate_expiry, estimated_delivery_date, collaborator_observations, created_by, status,
    quotation_amount, quotation_details, disposition, contract_type, moneda
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertActivityStmt = db.prepare(
    "INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva) VALUES (?, ?, ?, ?)"
  );
  const insertAssignmentStmt = db.prepare(
    "INSERT INTO work_order_activity_assignments (activity_id, user_id) VALUES (?, ?)"
  );
  const insertFacturaLinkStmt = db.prepare(
    "INSERT INTO factura_ots (factura_id, ot_id) VALUES (?, ?)"
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
      "pendiente",
      data.otData.quotation_amount,
      data.otData.quotation_details,
      data.otData.disposition,
      data.otData.contract_type,
      data.otData.moneda
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
          }
        }
      }
    }

    if (data.factura_ids && Array.isArray(data.factura_ids)) {
      for (const factura_id of data.factura_ids) {
        insertFacturaLinkStmt.run(factura_id, otId);
      }
    }

    addHistoryEntry(otId, data.created_by, ["Se creó la Orden de Trabajo."]);

    return { id: otId };
  });

  try {
    const result = createTransaction({
      otData,
      activities,
      created_by,
      factura_ids,
    });
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

// [GET] /api/ots/:id/history
router.get("/:id/history", (req, res) => {
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
});

// [GET] /api/ots/:id
router.get("/:id", (req: Request, res: Response) => {
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
          `
        SELECT f.id, f.numero_factura, f.monto 
        FROM facturas f
        JOIN factura_ots fo ON f.id = fo.factura_id
        WHERE fo.ot_id = ?
      `
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
});

// [PUT] /api/ots/:id
router.put("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    activities = [],
    role,
    user_id,
    factura_ids = [],
    ...otData
  } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: "Falta el ID del usuario." });
  }

  const user: { role: string } | undefined = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(user_id) as { role: string } | undefined;

  if (!user) {
    return res.status(403).json({ error: "Usuario no encontrado." });
  }

  const oldOT: any = db
    .prepare("SELECT * FROM work_orders WHERE id = ?")
    .get(id);

  if (!oldOT) {
    return res.status(404).json({ error: "OT no encontrada" });
  }

  // Lógica para empleados (solo pueden cambiar sus observaciones)
  if (role === "empleado") {
    // ... tu lógica de menciones ...
    db.prepare(
      "UPDATE work_orders SET collaborator_observations = ? WHERE id = ?"
    ).run(otData.collaborator_observations, id);
    return res.status(200).json({ message: "Observaciones guardadas." });
  }

  // Lógica para administradores
  if (!["administrador", "administracion", "director"].includes(user.role)) {
    return res
      .status(403)
      .json({ error: "No tienes permisos para editar esta OT." });
  }

  const updateStmt = db.prepare(
    `UPDATE work_orders SET date=?, type=?, product=?, brand=?, model=?, seal_number=?, observations=?, certificate_expiry=?, estimated_delivery_date=?, status=?, quotation_amount=?, quotation_details=?, disposition=?, contract_type=?, collaborator_observations=?, contact_id=?, updated_at=CURRENT_TIMESTAMP, moneda=? WHERE id=?`
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
  const deleteFacturaLinksStmt = db.prepare(
    "DELETE FROM factura_ots WHERE ot_id = ?"
  );
  const insertFacturaLinkStmt = db.prepare(
    "INSERT INTO factura_ots (factura_id, ot_id) VALUES (?, ?)"
  );

  const updateTransaction = db.transaction(() => {
    const changes = [];
    if (oldOT.product !== otData.product) {
      changes.push(
        `Producto cambió de "${oldOT.product || "N/A"}" a "${
          otData.product || "N/A"
        }".`
      );
    }
    if (oldOT.observations !== otData.observations) {
      changes.push("Se modificaron las observaciones generales.");
    }
    if (changes.length > 0) {
      addHistoryEntry(parseInt(id), user_id, changes);
    }

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
      otData.moneda,
      id
    );

    deleteActivitiesStmt.run(id);
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
            // ... tu lógica de notificaciones de asignación ...
          }
        }
      }
    }

    deleteFacturaLinksStmt.run(id);
    if (factura_ids && Array.isArray(factura_ids)) {
      for (const factura_id of factura_ids) {
        insertFacturaLinkStmt.run(factura_id, id);
      }
    }
    // ... tu lógica de notificaciones por mención ...
  });

  try {
    updateTransaction();
    res.status(200).json({ message: "OT actualizada con éxito." });
  } catch (error) {
    console.error("Error al actualizar OT:", error);
    res.status(500).json({ error: "Error al actualizar la OT." });
  }
});

router.put("/:id/authorize", (req: Request, res: Response) => {
  const { userId } = req.body;
  const otId = parseInt(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: "userId es requerido." });
  }
  const authorizer: { role: string } | undefined = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(userId) as { role: string } | undefined;
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
        .get(otId) as { custom_id: string } | undefined;
      const assignedUsers: { user_id: number }[] = db
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
  const otId = parseInt(req.params.id);
  const { userId } = req.body; // Se necesita para el historial
  try {
    // CORRECCIÓN: Se elimina "AND status = 'pendiente'" para permitir desautorizar en cualquier estado previo a finalizada.
    const info = db
      .prepare(
        "UPDATE work_orders SET authorized = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(otId);

    if (info.changes === 0) {
      return res.status(404).json({
        error: "OT no encontrada o ya estaba desautorizada.",
      });
    }

    if (userId)
      addHistoryEntry(otId, userId, ["La autorización de la OT fue revocada."]);
    res.status(200).json({ message: "OT desautorizada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al desautorizar la OT." });
  }
});

router.put("/:id/close", (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId es requerido." });
  }

  const closer: { role: string } | undefined = db
    .prepare("SELECT role FROM users WHERE id = ?")
    .get(userId) as { role: string } | undefined;
  if (!closer || closer.role !== "director") {
    return res
      .status(403)
      .json({ error: "Solo un director puede cerrar OTs." });
  }

  const ot: any = db.prepare("SELECT * FROM work_orders WHERE id = ?").get(id);
  if (!ot) {
    return res.status(404).json({ error: "OT no encontrada." });
  }
  if (ot.status !== "finalizada") {
    return res.status(400).json({
      error: "La OT debe estar en estado 'finalizada' para poder cerrarse.",
    });
  }

  const getPointsForActivity = (activity: string): number => {
    const row: { points: number } | undefined = db
      .prepare("SELECT points FROM activity_points WHERE activity = ?")
      .get(activity) as { points: number } | undefined;
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

router.put("/activities/:activityId/start", (req: Request, res: Response) => {
  const { activityId } = req.params;
  const { userId } = req.body; // Se necesita para el historial
  const startTransaction = db.transaction(() => {
    const activity: any = db
      .prepare(
        "SELECT work_order_id, activity FROM work_order_activities WHERE id = ? AND status = 'pendiente'"
      )
      .get(activityId);

    if (!activity) {
      throw new Error("La actividad ya fue iniciada o no se encontró.");
    }

    db.prepare(
      "UPDATE work_order_activities SET status = 'en_progreso', started_at = CURRENT_TIMESTAMP WHERE id = ?"
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
        .get(activity.work_order_id) as
        | { created_by: number; custom_id: string }
        | undefined;
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
  const { userId } = req.body; // Se necesita para el historial
  const stopTransaction = db.transaction(() => {
    const activity: any = db
      .prepare(
        "SELECT work_order_id, activity FROM work_order_activities WHERE id = ? AND status = 'en_progreso'"
      )
      .get(activityId);

    if (!activity) {
      throw new Error("La actividad no está en progreso o no existe.");
    }
    db.prepare(
      "UPDATE work_order_activities SET status = 'finalizada', completed_at = CURRENT_TIMESTAMP WHERE id = ?"
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
      .get(otId) as { count: number };
    if (pendingActivities.count === 0) {
      db.prepare(
        "UPDATE work_orders SET status = 'finalizada' WHERE id = ?"
      ).run(otId);
      const ot: { created_by: number; custom_id: string } | undefined = db
        .prepare("SELECT created_by, custom_id FROM work_orders WHERE id = ?")
        .get(otId) as { created_by: number; custom_id: string } | undefined;
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

router.get("/cliente/:id", (req, res) => {
  try {
    const ots = db
      .prepare(
        `
        SELECT id, custom_id, product, status 
        FROM work_orders 
        WHERE client_id = ? AND status != 'facturada'
      `
      )
      .all(req.params.id);
    res.json(ots);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las órdenes de trabajo." });
  }
});

export default router;
