// RUTA: servidor/src/services/sseService.ts

import { Request, Response } from "express";

interface Client {
  id: number;
  res: Response;
}

let clients: Client[] = [];

const sseHandler = (req: Request, res: Response, userId: number) => {
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

  const data = `data: ${JSON.stringify({
    type: "connection",
    message: "SSE Connected",
  })}\n\n`;
  res.write(data);

  req.on("close", () => {
    clients = clients.filter((client) => client.id !== userId);
    console.log(
      `[SSE] Cliente desconectado: User ${userId}. Total: ${clients.length}`
    );
  });
};

const sendToUser = (userId: number, data: any) => {
  const client = clients.find((c) => c.id === userId);
  if (client) {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
};

const sendToAll = (data: any) => {
  clients.forEach((client) => {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
};

// --- CORRECCIÓN CLAVE AQUÍ ---
// Se agrupan todas las funciones en un único objeto exportado llamado 'sseService'.
export const sseService = {
  handler: sseHandler,
  sendToUser: sendToUser,
  sendToAll: sendToAll,
};
