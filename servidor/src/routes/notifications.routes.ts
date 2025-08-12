// RUTA: /servidor/src/routes/notifications.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";

const router = Router();

// [GET] /api/notifications/:userId
router.get("/:userId", (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const notifications = db
      .prepare(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC"
      )
      .all(userId);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las notificaciones." });
  }
});

// [PUT] /api/notifications/mark-as-read
router.put("/mark-as-read", (req: Request, res: Response) => {
  const { ids, userId } = req.body;
  if (!Array.isArray(ids) || !userId) {
    return res
      .status(400)
      .json({ error: "Se requiere un array de IDs y un userId." });
  }

  try {
    const placeholders = ids.map(() => "?").join(",");
    const stmt = db.prepare(
      `UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND user_id = ?`
    );
    stmt.run(...ids, userId);
    res.status(200).json({ message: "Notificaciones marcadas como leídas." });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error al marcar las notificaciones como leídas." });
  }
});

export default router;
