// RUTA: /servidor/src/routes/notifications.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";
import { getClients, setClients } from "../server"; // --- CAMBIO: Importamos los manejadores de clientes ---

const router = Router();

// --- INICIO CAMBIO: Función para enviar notificaciones a usuarios específicos ---
export const sendNotificationToUser = (userId: number, notification: any) => {
  const clients = getClients();
  const userClient = clients.find((c) => c.id === userId);
  if (userClient) {
    userClient.res.write(`data: ${JSON.stringify(notification)}\n\n`);
  }
};
// --- FIN CAMBIO ---

// --- INICIO CAMBIO: Endpoint para Server-Sent Events (SSE) ---
router.get("/events/:userId", (req: Request, res: Response) => {
  const { userId } = req.params;

  // Configurar cabeceras para SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Enviar cabeceras inmediatamente

  // Guardar el cliente
  const newClient = {
    id: parseInt(userId, 10),
    res,
  };
  let clients = getClients();
  clients.push(newClient);
  setClients(clients);

  console.log(`Cliente ${userId} conectado para notificaciones SSE.`);

  // Enviar un evento inicial de conexión (opcional)
  res.write(
    'data: {"message": "Conectado a notificaciones en tiempo real"}\n\n'
  );

  // Manejar desconexión del cliente
  req.on("close", () => {
    console.log(`Cliente ${userId} desconectado.`);
    clients = getClients();
    setClients(clients.filter((c) => c.id !== parseInt(userId, 10)));
  });
});
// --- FIN CAMBIO ---

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
