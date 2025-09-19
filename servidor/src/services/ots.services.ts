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

    const getActivities = (otId: string) => {
      return db
        .prepare(
          `SELECT wa.id, wa.activity, wa.norma, wa.precio_sin_iva,
             json_group_array(json_object('id', u.id, 'name', u.name)) as assigned_users
             FROM work_order_activities wa
             LEFT JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
             LEFT JOIN users u ON waa.user_id = u.id
             WHERE wa.work_order_id = ?
             GROUP BY wa.id`
        )
        .all(otId)
        .map((act: any) => ({
          ...act,
          assigned_users: JSON.parse(act.assigned_users).filter(
            (u: any) => u.id !== null
          ),
        }));
    };

    const originalActivities = getActivities(id);

    const fieldsToUpdate = Object.keys(mainOtData)
      .filter((key) => originalOt.hasOwnProperty(key))
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

    if (activities && Array.isArray(activities)) {
      const incomingActivityIds = new Set(
        activities.map((a) => a.id).filter((id) => id)
      );
      const activitiesToDelete = originalActivities.filter(
        (oa) => !incomingActivityIds.has(oa.id)
      );

      const deleteActivityStmt = db.prepare(
        "DELETE FROM work_order_activities WHERE id = ?"
      );
      const deleteAssignmentsStmt = db.prepare(
        "DELETE FROM work_order_activity_assignments WHERE activity_id = ?"
      );

      for (const activity of activitiesToDelete) {
        deleteAssignmentsStmt.run(activity.id);
        deleteActivityStmt.run(activity.id);
      }

      const upsertActivityStmt = db.prepare(
        `INSERT INTO work_order_activities (id, work_order_id, activity, norma, precio_sin_iva) 
             VALUES (@id, @work_order_id, @activity, @norma, @precio_sin_iva)
             ON CONFLICT(id) DO UPDATE SET 
               activity=excluded.activity, 
               norma=excluded.norma, 
               precio_sin_iva=excluded.precio_sin_iva`
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

        const deleteAssignmentsForActivityStmt = db.prepare(
          "DELETE FROM work_order_activity_assignments WHERE activity_id = ?"
        );

        if (activityId && Array.isArray(activity.assigned_users)) {
          deleteAssignmentsForActivityStmt.run(activityId);
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
      const mainChanges = getChanges(originalOt, updatedOt);

      const updatedActivities = getActivities(id);
      const activityChanges = getActivityChanges(
        originalActivities,
        updatedActivities
      );

      const changes = [...mainChanges, ...activityChanges];
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
  const ignoredKeys = new Set(["updated_at", "created_at", "activities"]);

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

/**
 * Compara dos arrays de actividades y devuelve un array de strings con los cambios.
 */
function getActivityChanges(original: any[], updated: any[]): string[] {
  const changes: string[] = [];
  const originalMap = new Map(original.map((a) => [a.id, a]));
  const updatedMap = new Map(updated.map((a) => [a.id, a]));

  // Detectar actividades agregadas y modificadas
  for (const updatedActivity of updated) {
    const originalActivity = originalMap.get(updatedActivity.id);

    if (!originalActivity) {
      changes.push(`Se agregó la actividad: "${updatedActivity.activity}".`);
      // No 'continue' para que también registre las asignaciones de la nueva actividad
    }

    const activityNameForLog =
      updatedActivity.activity ||
      (originalActivity ? originalActivity.activity : "Actividad desconocida");

    // Comparar campos si la actividad ya existía
    if (originalActivity) {
      if (originalActivity.activity !== updatedActivity.activity) {
        changes.push(
          `Actividad "${originalActivity.activity}" renombrada a "${updatedActivity.activity}".`
        );
      }
      if (originalActivity.norma !== updatedActivity.norma) {
        changes.push(
          `Norma de "${activityNameForLog}" cambiada a "${updatedActivity.norma}".`
        );
      }
      if (originalActivity.precio_sin_iva !== updatedActivity.precio_sin_iva) {
        changes.push(
          `Precio de "${activityNameForLog}" cambiado a ${updatedActivity.precio_sin_iva}.`
        );
      }
    }

    const originalUsers = new Map(
      (originalActivity?.assigned_users || []).map((u: any) => [u.id, u.name])
    );
    const updatedUsers = new Map(
      (updatedActivity.assigned_users || []).map((u: any) => [u.id, u.name])
    );

    for (const [userId, userName] of updatedUsers) {
      if (!originalUsers.has(userId)) {
        changes.push(`Usuario ${userName} asignado a "${activityNameForLog}".`);
      }
    }
    for (const [userId, userName] of originalUsers) {
      if (!updatedUsers.has(userId)) {
        changes.push(
          `Usuario ${userName} desasignado de "${activityNameForLog}".`
        );
      }
    }
  }

  // Detectar actividades eliminadas
  for (const originalActivity of original) {
    if (!updatedMap.has(originalActivity.id)) {
      changes.push(`Se eliminó la actividad: "${originalActivity.activity}".`);
    }
  }

  return changes;
}
