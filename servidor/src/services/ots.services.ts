// RUTA: servidor/src/services/ots.services.ts

import db from "../config/database";
import { addHistoryEntry, generateCustomId } from "../helpers/ots.helpers";

/**
 * Crea una nueva Orden de Trabajo (OT) en la base de datos.
 */
export const createNewOt = (otData: any) => {
  const {
    activities,
    user_id,
    seal_entity,
    seal_number,
    factura_ids,
    ...mainOtData
  } = otData;

  const createTransaction = db.transaction(() => {
    if (!mainOtData.custom_id) {
      mainOtData.custom_id = generateCustomId(
        mainOtData.date,
        mainOtData.type,
        mainOtData.client_id
      );
    }

    const mainColumns = Object.keys(mainOtData).join(", ");
    const mainPlaceholders = Object.keys(mainOtData)
      .map(() => "?")
      .join(", ");
    const mainValues = Object.values(mainOtData);

    const otInsertResult = db
      .prepare(
        `INSERT INTO work_orders (${mainColumns}) VALUES (${mainPlaceholders})`
      )
      .run(mainValues);

    const otId = otInsertResult.lastInsertRowid;

    if (activities && Array.isArray(activities)) {
      const activityStmt = db.prepare(
        "INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva) VALUES (?, ?, ?, ?)"
      );
      const assignmentStmt = db.prepare(
        "INSERT INTO work_order_activity_assignments (activity_id, user_id) VALUES (?, ?)"
      );

      for (const activity of activities) {
        const activityInsertResult = activityStmt.run(
          otId,
          activity.activity,
          activity.norma,
          activity.precio_sin_iva
        );
        const activityId = activityInsertResult.lastInsertRowid;

        if (activity.assigned_to && Array.isArray(activity.assigned_to)) {
          for (const userId of activity.assigned_to) {
            assignmentStmt.run(activityId, userId);
          }
        }
      }
    }

    if (user_id) {
      addHistoryEntry(Number(otId), user_id, ["Se creó la Orden de Trabajo."]);
    }

    return { id: otId, ...mainOtData };
  });

  return createTransaction();
};

/**
 * Actualiza una Orden de Trabajo existente.
 */
export const updateExistingOt = (id: string, otData: any) => {
  // --- CORRECCIÓN INTELIGENTE ---
  // Se excluyen los objetos y arrays que no son columnas directas.
  const {
    activities,
    user_id,
    client,
    facturas,
    factura_ids,
    assigned_users,
    ...mainOtData
  } = otData;

  const updateTransaction = db.transaction(() => {
    const originalOt = db
      .prepare("SELECT * FROM work_orders WHERE id = ?")
      .get(id);
    if (!originalOt) {
      throw new Error("OT no encontrada");
    }

    // Filtra los campos para actualizar solo los que existen en la tabla.
    const fieldsToUpdate = Object.keys(mainOtData)
      .filter((key) => originalOt.hasOwnProperty(key)) // Comprueba si la columna existe en la tabla
      .map((key) => `${key} = ?`)
      .join(", ");

    if (fieldsToUpdate) {
      const values = Object.keys(mainOtData)
        .filter((key) => originalOt.hasOwnProperty(key))
        .map((key) => mainOtData[key]);

      const stmt = db.prepare(
        `UPDATE work_orders SET ${fieldsToUpdate}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      );
      stmt.run(...values, id);
    }

    // Lógica para actualizar actividades y asignaciones (ya estaba correcta)
    if (activities && Array.isArray(activities)) {
      const upsertActivityStmt = db.prepare(
        `INSERT INTO work_order_activities (id, work_order_id, activity, norma, precio_sin_iva) 
             VALUES (@id, @work_order_id, @activity, @norma, @precio_sin_iva)
             ON CONFLICT(id) DO UPDATE SET 
               activity=excluded.activity, 
               norma=excluded.norma, 
               precio_sin_iva=excluded.precio_sin_iva`
      );
      const deleteAssignmentsStmt = db.prepare(
        "DELETE FROM work_order_activity_assignments WHERE activity_id = ?"
      );
      const insertAssignmentStmt = db.prepare(
        "INSERT INTO work_order_activity_assignments (activity_id, user_id) VALUES (?, ?)"
      );

      for (const activity of activities) {
        let activityId = activity.id;

        if (!activityId || activityId === 0) {
          const newActivityResult = db
            .prepare(
              `INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva) 
                   VALUES (?, ?, ?, ?)`
            )
            .run(
              id,
              activity.activity,
              activity.norma,
              activity.precio_sin_iva
            );
          activityId = newActivityResult.lastInsertRowid;
        } else {
          upsertActivityStmt.run({
            id: activityId,
            work_order_id: parseInt(id),
            activity: activity.activity,
            norma: activity.norma,
            precio_sin_iva: activity.precio_sin_iva,
          });
        }

        if (activityId && Array.isArray(activity.assigned_users)) {
          deleteAssignmentsStmt.run(activityId);
          for (const user of activity.assigned_users) {
            insertAssignmentStmt.run(activityId, user.id);
          }
        }
      }
    }

    if (user_id) {
      const updatedOt = db
        .prepare("SELECT * FROM work_orders WHERE id = ?")
        .get(id);
      const changes = getChanges(originalOt, updatedOt);
      if (changes.length > 0) {
        addHistoryEntry(parseInt(id), user_id, changes);
      }
    }
  });

  updateTransaction();
  return { message: "OT actualizada con éxito." };
};

/**
 * Compara dos objetos y devuelve un array de strings con los cambios.
 */
function getChanges(original: any, updated: any): string[] {
  const changes: string[] = [];
  const ignoredKeys = new Set(["updated_at", "created_at"]);

  for (const key in updated) {
    if (ignoredKeys.has(key)) continue;

    const originalValue = original[key] ?? "";
    const updatedValue = updated[key] ?? "";

    if (originalValue !== updatedValue) {
      changes.push(
        `Campo '${key}' cambiado de '${originalValue || "vacío"}' a '${
          updatedValue || "vacío"
        }'.`
      );
    }
  }
  return changes;
}
