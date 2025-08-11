// RUTA: /servidor/src/routes/statistics.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";

const router = Router();

// [GET] /api/statistics/user/:id
router.get("/user/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = db
      .prepare("SELECT id, name, email, role, points FROM users WHERE id = ?")
      .get(id);

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

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
        ORDER BY wa.completed_at DESC
    `
      )
      .all(id);

    const activityCounts = db
      .prepare(
        `
        SELECT activity, COUNT(*) as count
        FROM work_order_activities wa
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        WHERE waa.user_id = ? AND wa.status = 'finalizada'
        GROUP BY activity
    `
      )
      .all(id);

    const totalOTsFinalizadas = db
      .prepare(
        `
        SELECT COUNT(DISTINCT wo.id) as count
        FROM work_orders wo
        JOIN work_order_activities wa ON wo.id = wa.work_order_id
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        WHERE waa.user_id = ? AND wo.status IN ('finalizada', 'cerrada')
    `
      )
      .get(id) as { count: number };

    res.status(200).json({
      user,
      stats: {
        totalPoints: (user as any).points,
        totalCompletedActivities: completedActivities.length,
        totalOTsFinalizadas: totalOTsFinalizadas.count,
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
    // --- Resumen General ---
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

    // --- Distribuciones ---
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

    // --- Rankings ---
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

    // --- Tendencia de Creación de OTs (Últimos 12 meses) ---
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
