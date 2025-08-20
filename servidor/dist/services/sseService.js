"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationToUser = exports.sseHandler = void 0;
// Este array ahora vive aquí, de forma segura y centralizada.
let clients = [];
/**
 * Maneja las conexiones de Server-Sent Events (SSE).
 * @param req - Objeto de solicitud de Express.
 * @param res - Objeto de respuesta de Express.
 * @param userId - El ID del usuario que se está conectando.
 */
const sseHandler = (req, res, userId) => {
    const headers = {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
    };
    res.writeHead(200, headers);
    const newClient = {
        id: userId,
        res,
    };
    clients.push(newClient);
    console.log(`[SSE] Cliente conectado: User ${userId}. Total: ${clients.length}`);
    // Envía un mensaje de confirmación de conexión al cliente.
    const data = `data: ${JSON.stringify({
        type: "connection",
        message: "SSE Connected",
    })}\n\n`;
    res.write(data);
    // Maneja la desconexión del cliente.
    req.on("close", () => {
        clients = clients.filter((client) => client.id !== userId);
        console.log(`[SSE] Cliente desconectado: User ${userId}. Total: ${clients.length}`);
    });
};
exports.sseHandler = sseHandler;
/**
 * Envía datos a un usuario específico a través de su conexión SSE.
 * @param userId - El ID del usuario destinatario.
 * @param data - El objeto de datos a enviar (normalmente una notificación).
 */
const sendNotificationToUser = (userId, data) => {
    const client = clients.find((c) => c.id === userId);
    if (client) {
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
};
exports.sendNotificationToUser = sendNotificationToUser;
