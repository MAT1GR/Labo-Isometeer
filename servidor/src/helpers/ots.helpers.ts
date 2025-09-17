// RUTA: servidor/src/helpers/ots.helpers.ts

import db from "../config/database";
// --- CORRECCIÓN AQUÍ: Se importa CON las llaves {} ---
import { sseService } from "../services/sseService";

export const addHistoryEntry = (
  ot_id: number,
  user_id: number,
  changes: string[]
) => {
  if (changes.length === 0) return;
  const description = changes.join(" ");

  try {
    const stmt = db.prepare(
      "INSERT INTO ot_history (ot_id, user_id, description) VALUES (?, ?, ?)"
    );
    stmt.run(ot_id, user_id, description);
  } catch (error: any) {
    if (
      error.code === "SQLITE_ERROR" &&
      error.message.includes("no such table: ot_history")
    ) {
      console.warn(
        "ADVERTENCIA: La tabla 'ot_history' no existe. No se registrará el historial de la OT."
      );
    } else {
      console.error("Error al registrar entrada en el historial:", error);
    }
  }
};

export const createAndSendNotification = (
  user_id: number,
  message: string,
  ot_id: number
) => {
  try {
    const stmt = db.prepare(
      "INSERT INTO notifications (user_id, message, ot_id) VALUES (?, ?, ?)"
    );
    stmt.run(user_id, message, ot_id);
    sseService.sendToUser(user_id, { type: "new_notification", message });
  } catch (error) {
    console.error("Error creando notificación:", error);
  }
};

export const generateCustomId = (
  date: string,
  type: string,
  client_id: string
): string => {
  const client: { name: string } | undefined = db
    .prepare("SELECT name FROM clients WHERE id = ?")
    .get(client_id) as any;
  if (!client) throw new Error("Cliente no encontrado");

  const clientPrefix = client.name.substring(0, 3).toUpperCase();
  const dateObj = new Date(date);
  const year = dateObj.getFullYear().toString().slice(-2);
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");

  let typePrefix = "";
  switch (type) {
    case "Ensayo SE":
      typePrefix = "SE";
      break;
    case "Ensayo EE":
      typePrefix = "EE";
      break;
    case "Calibración":
      typePrefix = "CAL";
      break;
    case "Otros Servicios":
      typePrefix = "OS";
      break;
    default:
      typePrefix = "OT";
      break;
  }

  const baseId = `${clientPrefix}-${typePrefix}-${year}${month}`;
  const stmt = db.prepare(
    "SELECT COUNT(*) as count FROM work_orders WHERE custom_id LIKE ?"
  );
  const result: { count: number } | undefined = stmt.get(`${baseId}-%`) as any;
  const nextNumber = (result ? result.count : 0) + 1;

  return `${baseId}-${nextNumber.toString().padStart(3, "0")}`;
};
