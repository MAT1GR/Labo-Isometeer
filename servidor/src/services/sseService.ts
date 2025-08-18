import { Request, Response } from "express";

interface Client {
  id: number;
  res: Response;
}

// Este array ahora vive aquí, de forma segura y centralizada.
let clients: Client[] = [];

/**
 * Maneja las conexiones de Server-Sent Events (SSE).
 * @param req - Objeto de solicitud de Express.
 * @param res - Objeto de respuesta de Express.
 * @param userId - El ID del usuario que se está conectando.
 */
export const sseHandler = (req: Request, res: Response, userId: number) => {
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };
  res.writeHead(200, headers);

  const newClient: Client = {
    id: userId,
    res,
  };
  clients.push(newClient);
  console.log(
    `[SSE] Cliente conectado: User ${userId}. Total: ${clients.length}`
  );

  // Envía un mensaje de confirmación de conexión al cliente.
  const data = `data: ${JSON.stringify({
    type: "connection",
    message: "SSE Connected",
  })}\n\n`;
  res.write(data);

  // Maneja la desconexión del cliente.
  req.on("close", () => {
    clients = clients.filter((client) => client.id !== userId);
    console.log(
      `[SSE] Cliente desconectado: User ${userId}. Total: ${clients.length}`
    );
  });
};

/**
 * Envía datos a un usuario específico a través de su conexión SSE.
 * @param userId - El ID del usuario destinatario.
 * @param data - El objeto de datos a enviar (normalmente una notificación).
 */
export const sendNotificationToUser = (userId: number, data: any) => {
  const client = clients.find((c) => c.id === userId);
  if (client) {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};
export function sendToUser(id: number, newNotification: {}) {
  throw new Error("Function not implemented.");
}
