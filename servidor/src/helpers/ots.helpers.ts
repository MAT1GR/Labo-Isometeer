// RUTA: servidor/src/helpers/ots.helpers.ts

import { Statement } from "better-sqlite3";
import db from "../config/database";
import { sendNotificationToUser } from "../routes/notifications.routes"; // Asegúrate que la ruta sea correcta

/**
 * Registra una nueva entrada en el historial de una OT.
 */
export const addHistoryEntry = (
  otId: number,
  userId: number,
  changes: string[]
) => {
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

/**
 * Crea una notificación en la BBDD y la envía al usuario.
 */
export const createAndSendNotification = (
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

/**
 * Genera un ID de OT personalizado basado en fecha, tipo y cliente.
 */
export const generateCustomId = (
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
