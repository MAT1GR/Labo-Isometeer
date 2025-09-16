// RUTA: /servidor/src/routes/statistics.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";

// Se importan los nuevos controladores
import {
  getEstadisticasCobranza,
  getEstadisticasFacturacion,
  getPagos,
  getFacturas,
  getEstadisticasOT,
} from "../controllers/statistics.controller";

const router = Router();

// --- NUEVAS RUTAS PARA LA SECCIÓN DE ESTADÍSTICAS GENERALES ---

router.get("/cobranza", getEstadisticasCobranza);
router.get("/facturacion", getEstadisticasFacturacion);
router.get("/pagos", getPagos);
router.get("/facturas", getFacturas);
router.get("/ot", getEstadisticasOT);

// --- RUTAS EXISTENTES ---

// [GET] /api/statistics/user/:id
router.get("/user/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query; // Captura las fechas de la URL

    // Se obtiene el usuario CON sus puntos totales.
    const user = db
      .prepare("SELECT id, name, email, role, points FROM users WHERE id = ?")
      .get(id);

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    // --- Construcción del filtro de fecha y parámetros ---
    let dateFilter = "";
    const params: (string | number)[] = [id];

    if (startDate && endDate) {
      dateFilter = `AND wa.completed_at BETWEEN ? AND ?`;
      params.push(startDate as string, endDate as string);
    }

    // --- Consultas a la base de datos con el filtro de fecha ---

    const completedActivities = db
      .prepare(
        `
        SELECT
          wo.id as ot_id,
          wo.custom_id,
          wo.product,
          c.name as client_name,
          wa.activity,
          wa.completed_at
        FROM work_order_activities wa
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        JOIN work_orders wo ON wa.work_order_id = wo.id
        JOIN clients c ON wo.client_id = c.id
        WHERE waa.user_id = ? AND wa.status = 'finalizada'
        ${dateFilter}
        ORDER BY wa.completed_at DESC
      `
      )
      .all(...params);

    const activityCounts = db
      .prepare(
        `
        SELECT activity, COUNT(*) as count
        FROM work_order_activities wa
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        WHERE waa.user_id = ? AND wa.status = 'finalizada'
        ${dateFilter}
        GROUP BY activity
      `
      )
      .all(...params);

    const totalOTsFinalizadasResult = db
      .prepare(
        `
        SELECT COUNT(DISTINCT wo.id) as count
        FROM work_orders wo
        JOIN work_order_activities wa ON wo.id = wa.work_order_id
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        WHERE waa.user_id = ? AND wo.status IN ('finalizada', 'cerrada')
        ${dateFilter}
      `
      )
      .get(...params) as { count: number } | undefined;

    // NOTA: La consulta que sumaba puntos fue eliminada para corregir el error.
    // Los puntos ahora se toman del total del usuario y no se ven afectados por el filtro de fecha.

    res.status(200).json({
      user,
      stats: {
        // CORRECCIÓN: Se vuelve a usar el valor de la tabla de usuarios para evitar el crash.
        totalPoints: (user as any).points || 0,
        totalCompletedActivities: completedActivities.length,
        totalOTsFinalizadas: totalOTsFinalizadasResult?.count || 0,
      },
      activityDistribution: activityCounts,
      completedWorkOrders: completedActivities,
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res
      .status(500)
      .json({ error: "Error al obtener las estadísticas del usuario." });
  }
});

// [GET] /api/statistics/all
router.get("/all", (req: Request, res: Response) => {
  try {
    const totalOTs = (
      db.prepare("SELECT COUNT(*) as count FROM work_orders").get() as {
        count: number;
      }
    ).count;
    const totalClients = (
      db.prepare("SELECT COUNT(*) as count FROM clients").get() as {
        count: number;
      }
    ).count;
    const totalUsers = (
      db.prepare("SELECT COUNT(*) as count FROM users").get() as {
        count: number;
      }
    ).count;
    const totalRevenue =
      (
        db
          .prepare(
            "SELECT SUM(precio_sin_iva) as total FROM work_order_activities"
          )
          .get() as { total: number | null }
      ).total || 0;
    const averageRevenuePerOT = totalOTs > 0 ? totalRevenue / totalOTs : 0;
    const otsByStatus = db
      .prepare(
        `
        SELECT status, COUNT(*) as count 
        FROM work_orders 
        GROUP BY status
      `
      )
      .all();
    const otsByType = db
      .prepare(
        `
        SELECT type, COUNT(*) as count 
        FROM work_orders 
        GROUP BY type
      `
      )
      .all();
    const topClients = db
      .prepare(
        `
        SELECT c.name, COUNT(wo.id) as count
        FROM clients c
        JOIN work_orders wo ON c.id = wo.client_id
        GROUP BY c.id
        ORDER BY count DESC
        LIMIT 10
      `
      )
      .all();
    const topUsersByCompletedOTs = db
      .prepare(
        `
        SELECT u.name, COUNT(DISTINCT wa.work_order_id) as count
        FROM users u
        JOIN work_order_activity_assignments waa ON u.id = waa.user_id
        JOIN work_order_activities wa ON waa.activity_id = wa.id
        WHERE wa.status = 'finalizada'
        GROUP BY u.id
        ORDER BY count DESC
        LIMIT 5
      `
      )
      .all();
    const topActivities = db
      .prepare(
        `
        SELECT activity, COUNT(*) as count
        FROM work_order_activities
        GROUP BY activity
        ORDER BY count DESC
        LIMIT 10
      `
      )
      .all();
    const otCreationTrend = db
      .prepare(
        `
        SELECT strftime('%Y-%m', date) as month, COUNT(id) as count
        FROM work_orders
        WHERE date >= date('now', '-12 months')
        GROUP BY month
        ORDER BY month ASC
      `
      )
      .all();

    res.status(200).json({
      summary: {
        totalOTs,
        totalClients,
        totalUsers,
        totalRevenue,
        averageRevenuePerOT,
      },
      otsByStatus,
      otsByType,
      topClients,
      topUsersByCompletedOTs,
      topActivities,
      otCreationTrend,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ error: "Error al obtener las estadísticas." });
  }
});

export default router;
