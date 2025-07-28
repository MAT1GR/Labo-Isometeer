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
        u.name as assigned_to_name
      FROM work_orders ot
      LEFT JOIN clients c ON ot.client_id = c.id
      LEFT JOIN users u ON ot.assigned_to = u.id
    `;
    const params: any[] = [];

    if (role === "empleado") {
      query += " WHERE ot.assigned_to = ? AND ot.authorized = 1";
      params.push(assigned_to);
    }

    query += " ORDER BY ot.created_at DESC";

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
    `INSERT INTO work_orders (custom_id, date, type, client_id, contract, product, brand, model, seal_number, observations, certificate_expiry, created_by, assigned_to, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertActivityStmt = db.prepare(
    "INSERT INTO work_order_activities (work_order_id, activity) VALUES (?, ?)"
  );

  const createTransaction = db.transaction(() => {
    const info = insertOTStmt.run(
      otData.custom_id,
      otData.date,
      otData.type,
      otData.client_id,
      otData.contract,
      otData.product,
      otData.brand,
      otData.model,
      otData.seal_number,
      otData.observations,
      otData.certificate_expiry,
      created_by,
      otData.assigned_to,
      "pendiente"
    );
    const otId = info.lastInsertRowid;
    let totalPoints = 0;
    for (const activity of activities) {
      insertActivityStmt.run(otId, activity);
      totalPoints += getPointsForActivity(activity);
    }
    if (otData.assigned_to && totalPoints > 0) {
      db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(
        totalPoints,
        otData.assigned_to
      );
    }
    return { id: otId };
  });

  try {
    const result = createTransaction();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Error al crear la OT." });
  }
});

// [PUT] /api/ots/:id/authorize
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
    // CORREGIDO: Se mantiene el estado como 'pendiente' al autorizar
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
          "SELECT activity FROM work_order_activities WHERE work_order_id = ?"
        )
        .all(req.params.id)
        .map((row: any) => row.activity);
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
        "UPDATE work_orders SET collaborator_observations = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(otData.collaborator_observations, id);
    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada" });
    return res.status(200).json({ message: "Observaciones guardadas." });
  }

  const updateStmt = db.prepare(
    `UPDATE work_orders SET date=?, type=?, contract=?, product=?, brand=?, model=?, seal_number=?, observations=?, certificate_expiry=?, status=?, assigned_to=?, quotation_amount=?, quotation_details=?, disposition=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
  );
  const deleteActivitiesStmt = db.prepare(
    "DELETE FROM work_order_activities WHERE work_order_id = ?"
  );
  const insertActivityStmt = db.prepare(
    "INSERT INTO work_order_activities (work_order_id, activity) VALUES (?, ?)"
  );

  const updateTransaction = db.transaction(() => {
    updateStmt.run(
      otData.date,
      otData.type,
      otData.contract,
      otData.product,
      otData.brand,
      otData.model,
      otData.seal_number,
      otData.observations,
      otData.certificate_expiry,
      otData.status,
      otData.assigned_to,
      otData.quotation_amount,
      otData.quotation_details,
      otData.disposition,
      id
    );
    deleteActivitiesStmt.run(id);
    for (const activity of activities) {
      insertActivityStmt.run(id, activity);
    }
  });

  try {
    updateTransaction();
    res.status(200).json({ message: "OT actualizada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la OT." });
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

// --- RUTAS DE ACCIONES DE OT ---
router.put("/:id/deauthorize", (req: Request, res: Response) => {
  try {
    const ot = db
      .prepare("SELECT status FROM work_orders WHERE id = ?")
      .get(req.params.id) as { status: string };
    if (!ot) return res.status(404).json({ error: "OT no encontrada." });

    if (ot.status !== "pendiente") {
      return res.status(403).json({
        error:
          "No se puede desautorizar una OT que ya está en progreso o finalizada.",
      });
    }

    const info = db
      .prepare(
        "UPDATE work_orders SET authorized = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(req.params.id);
    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada." });
    res.status(200).json({ message: "OT desautorizada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al desautorizar la OT." });
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
          "SELECT activity FROM work_order_activities WHERE work_order_id = ?"
        )
        .all(req.params.id)
        .map((row: any) => row.activity);
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
        "UPDATE work_orders SET collaborator_observations = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(otData.collaborator_observations, id);
    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada" });
    return res.status(200).json({ message: "Observaciones guardadas." });
  }

  const updateStmt = db.prepare(
    `UPDATE work_orders SET date=?, type=?, contract=?, product=?, brand=?, model=?, seal_number=?, observations=?, certificate_expiry=?, status=?, assigned_to=?, quotation_amount=?, quotation_details=?, disposition=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
  );
  const deleteActivitiesStmt = db.prepare(
    "DELETE FROM work_order_activities WHERE work_order_id = ?"
  );
  const insertActivityStmt = db.prepare(
    "INSERT INTO work_order_activities (work_order_id, activity) VALUES (?, ?)"
  );

  const updateTransaction = db.transaction(() => {
    updateStmt.run(
      otData.date,
      otData.type,
      otData.contract,
      otData.product,
      otData.brand,
      otData.model,
      otData.seal_number,
      otData.observations,
      otData.certificate_expiry,
      otData.status,
      otData.assigned_to,
      otData.quotation_amount,
      otData.quotation_details,
      otData.disposition,
      id
    );
    deleteActivitiesStmt.run(id);
    for (const activity of activities) {
      insertActivityStmt.run(id, activity);
    }
  });

  try {
    updateTransaction();
    res.status(200).json({ message: "OT actualizada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la OT." });
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

// --- RUTAS DE ACCIONES DE OT ---
router.put("/:id/deauthorize", (req: Request, res: Response) => {
  try {
    const ot = db
      .prepare("SELECT status FROM work_orders WHERE id = ?")
      .get(req.params.id) as { status: string };
    if (!ot) return res.status(404).json({ error: "OT no encontrada." });

    if (ot.status !== "autorizada") {
      return res.status(403).json({
        error:
          "Solo se puede desautorizar una OT que está en estado 'autorizada'.",
      });
    }

    const info = db
      .prepare(
        "UPDATE work_orders SET authorized = 0, status = 'pendiente', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(req.params.id);
    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada." });
    res.status(200).json({ message: "OT desautorizada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al desautorizar la OT." });
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
          "SELECT activity FROM work_order_activities WHERE work_order_id = ?"
        )

        .all(req.params.id)

        .map((row: any) => row.activity);

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
        "UPDATE work_orders SET collaborator_observations = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )

      .run(otData.collaborator_observations, id);

    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada" });

    return res.status(200).json({ message: "Observaciones guardadas." });
  }

  const updateStmt = db.prepare(
    `UPDATE work_orders SET date=?, type=?, contract=?, product=?, brand=?, model=?, seal_number=?, observations=?, certificate_expiry=?, status=?, assigned_to=?, quotation_amount=?, quotation_details=?, disposition=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
  );

  const deleteActivitiesStmt = db.prepare(
    "DELETE FROM work_order_activities WHERE work_order_id = ?"
  );

  const insertActivityStmt = db.prepare(
    "INSERT INTO work_order_activities (work_order_id, activity) VALUES (?, ?)"
  );

  const updateTransaction = db.transaction(() => {
    updateStmt.run(
      otData.date,

      otData.type,

      otData.contract,

      otData.product,

      otData.brand,

      otData.model,

      otData.seal_number,

      otData.observations,

      otData.certificate_expiry,

      otData.status,

      otData.assigned_to,

      otData.quotation_amount,

      otData.quotation_details,

      otData.disposition,

      id
    );

    deleteActivitiesStmt.run(id);

    for (const activity of activities) {
      insertActivityStmt.run(id, activity);
    }
  });

  try {
    updateTransaction();

    res.status(200).json({ message: "OT actualizada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la OT." });
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

// --- RUTAS DE ACCIONES DE OT ---

router.put("/:id/deauthorize", (req: Request, res: Response) => {
  try {
    const ot = db

      .prepare("SELECT status FROM work_orders WHERE id = ?")

      .get(req.params.id) as { status: string };

    if (!ot) return res.status(404).json({ error: "OT no encontrada." });

    // CORREGIDO: Permite desautorizar si no está en progreso o finalizada.

    if (ot.status !== "autorizada") {
      return res.status(403).json({
        error:
          "Solo se puede desautorizar una OT que está en estado 'autorizada'.",
      });
    }

    const info = db

      .prepare(
        "UPDATE work_orders SET authorized = 0, status = 'pendiente', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )

      .run(req.params.id);

    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada." });

    res.status(200).json({ message: "OT desautorizada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al desautorizar la OT." });
  }
});

router.put("/:id/start", (req: Request, res: Response) => {
  try {
    const info = db

      .prepare(
        "UPDATE work_orders SET status = 'en_progreso', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND started_at IS NULL"
      )

      .run(req.params.id);

    if (info.changes === 0)
      return res

        .status(400)

        .json({ error: "El trabajo ya fue iniciado o no se encontró la OT." });

    const updatedOT = db

      .prepare("SELECT * FROM work_orders WHERE id = ?")

      .get(req.params.id);

    res.status(200).json(updatedOT);
  } catch (error) {
    res.status(500).json({ error: "Error al iniciar el trabajo." });
  }
});

router.put("/:id/pause", (req: Request, res: Response) => {
  try {
    const info = db

      .prepare(
        "UPDATE work_orders SET status = 'pausada', paused_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'en_progreso'"
      )

      .run(req.params.id);

    if (info.changes === 0)
      return res.status(400).json({
        error: "Solo se puede pausar un trabajo que está en progreso.",
      });

    const updatedOT = db

      .prepare("SELECT * FROM work_orders WHERE id = ?")

      .get(req.params.id);

    res.status(200).json(updatedOT);
  } catch (error) {
    res.status(500).json({ error: "Error al pausar el trabajo." });
  }
});

router.put("/:id/resume", (req: Request, res: Response) => {
  try {
    const ot = db

      .prepare(
        "SELECT paused_at, total_pause_duration FROM work_orders WHERE id = ?"
      )

      .get(req.params.id) as {
      paused_at: string;

      total_pause_duration: number;
    };

    if (!ot || !ot.paused_at)
      return res.status(400).json({ error: "El trabajo no estaba en pausa." });

    const pauseStartTime = new Date(ot.paused_at).getTime();

    const resumeTime = new Date().getTime();

    const currentPauseSeconds = Math.round(
      (resumeTime - pauseStartTime) / 1000
    );

    const newTotalPauseDuration =
      (ot.total_pause_duration || 0) + currentPauseSeconds;

    const info = db

      .prepare(
        "UPDATE work_orders SET status = 'en_progreso', paused_at = NULL, total_pause_duration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )

      .run(newTotalPauseDuration, req.params.id);

    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada." });

    const updatedOT = db

      .prepare("SELECT * FROM work_orders WHERE id = ?")

      .get(req.params.id);

    res.status(200).json(updatedOT);
  } catch (error) {
    res.status(500).json({ error: "Error al reanudar el trabajo." });
  }
});

router.put("/:id/stop", (req: Request, res: Response) => {
  try {
    const ot = db

      .prepare(
        "SELECT started_at, assigned_to, status, paused_at, total_pause_duration FROM work_orders WHERE id = ?"
      )

      .get(req.params.id) as any;

    if (!ot || !ot.started_at)
      return res.status(400).json({ error: "El trabajo nunca fue iniciado." });

    let finalPauseDuration = ot.total_pause_duration || 0;

    if (ot.status === "pausada" && ot.paused_at) {
      finalPauseDuration += Math.round(
        (new Date().getTime() - new Date(ot.paused_at).getTime()) / 1000
      );
    }

    const workDurationSeconds =
      (new Date().getTime() - new Date(ot.started_at).getTime()) / 1000 -
      finalPauseDuration;

    const duration_minutes = Math.max(0, Math.round(workDurationSeconds / 60));

    const activities = db

      .prepare(
        "SELECT activity FROM work_order_activities WHERE work_order_id = ?"
      )

      .all(req.params.id) as { activity: string }[];

    const totalPoints = activities.reduce(
      (sum, item) => sum + getPointsForActivity(item.activity),

      0
    );

    const stopTransaction = db.transaction(() => {
      db.prepare(
        "UPDATE work_orders SET status = 'finalizada', completed_at = CURRENT_TIMESTAMP, duration_minutes = ?, paused_at = NULL, total_pause_duration = ? WHERE id = ?"
      ).run(duration_minutes, finalPauseDuration, req.params.id);

      if (ot.assigned_to && totalPoints > 0) {
        db.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(
          totalPoints,

          ot.assigned_to
        );
      }
    });

    stopTransaction();

    const updatedOT = db

      .prepare("SELECT * FROM work_orders WHERE id = ?")

      .get(req.params.id);

    res.status(200).json(updatedOT);
  } catch (error) {
    res.status(500).json({ error: "Error al finalizar el trabajo." });
  }
});

// --- RUTAS AUXILIARES ---

router.get("/generate-id", (req: Request, res: Response) => {
  try {
    const { date, type, client_id } = req.query;

    if (!date || !type || !client_id)
      return res.status(200).json({ previewId: "Completar campos..." });

    const client = db

      .prepare("SELECT code FROM clients WHERE id = ?")

      .get(client_id as string) as { code: string };

    if (!client) return res.status(200).json({ previewId: "Cliente inválido" });

    const dateObj = new Date(date as string);

    const year = dateObj.getUTCFullYear().toString().slice(-2);

    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, "0");

    const day = dateObj.getUTCDate().toString().padStart(2, "0");

    const datePrefix = `${year}${month}${day}`;

    const otsTodayCount = (
      db

        .prepare("SELECT COUNT(*) as count FROM work_orders WHERE date = ?")

        .get(date as string) as { count: number }
    ).count;

    const sequentialNumber = otsTodayCount + 1;

    const typeLetter = (type as string).charAt(0).toUpperCase();

    const clientCode = client.code;

    const custom_id = `${datePrefix}${sequentialNumber} ${typeLetter} ${clientCode}`;

    res.status(200).json({ previewId: custom_id });
  } catch (error) {
    res.status(500).json({ error: "Error al generar el ID" });
  }
});

// CORREGIDO: Ruta timeline ahora usa path parameters

router.get(
  "/timeline/:assigned_to/:year/:month",

  (req: Request, res: Response) => {
    const { year, month, assigned_to } = req.params;

    if (!year || !month || !assigned_to)
      return res.status(400).json({ error: "Faltan parámetros." });

    try {
      const startDate = new Date(Date.UTC(Number(year), Number(month) - 1, 1));

      const endDate = new Date(Date.UTC(Number(year), Number(month), 1));

      const query = `

            SELECT id, custom_id, product, started_at, completed_at, status, duration_minutes

            FROM work_orders

            WHERE assigned_to = ? AND authorized = 1 AND started_at IS NOT NULL AND started_at < ? AND (completed_at >= ? OR completed_at IS NULL)

        `;

      const ots = db

        .prepare(query)

        .all(assigned_to, endDate.toISOString(), startDate.toISOString());

      res.status(200).json(ots);
    } catch (error) {
      res

        .status(500)

        .json({ error: "Error al obtener los datos para la línea de tiempo." });
    }
  }
);

export default router;
