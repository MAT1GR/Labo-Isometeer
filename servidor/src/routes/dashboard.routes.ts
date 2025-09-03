// RUTA: /servidor/src/routes/dashboard.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";

const router = Router();

// [GET] /api/dashboard/stats
router.get("/stats", (req: Request, res: Response) => {
  try {
    const { period = "week" } = req.query;

    let woDateFilterClause = "";
    let cobrosDateFilterClause = "";

    switch (period) {
      case "year":
        woDateFilterClause = ` WHERE strftime('%Y', wo.date) = strftime('%Y', 'now')`;
        cobrosDateFilterClause = ` WHERE strftime('%Y', fecha) = strftime('%Y', 'now')`;
        break;
      case "month":
        woDateFilterClause = ` WHERE strftime('%Y-%m', wo.date) = strftime('%Y-%m', 'now')`;
        cobrosDateFilterClause = ` WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', 'now')`;
        break;
      case "week":
      default:
        woDateFilterClause = ` WHERE wo.date >= date('now', '-6 days')`;
        cobrosDateFilterClause = ` WHERE fecha >= date('now', '-6 days')`;
        break;
    }

    const getOtCount = (customWhere: string = "1 = 1") => {
      const query = `SELECT COUNT(*) as count FROM work_orders as wo ${woDateFilterClause} AND ${customWhere}`;
      return (db.prepare(query).get() as { count: number }).count;
    };

    const getTotalClients = () =>
      (
        db.prepare(`SELECT COUNT(*) as count FROM clients`).get() as {
          count: number;
        }
      ).count;

    const getOverdueInvoices = () =>
      (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM facturas WHERE estado = 'vencida'`
          )
          .get() as {
          count: number;
        }
      ).count || 0;

    const getTotalRevenue = () => {
      const result = db
        .prepare(
          `SELECT SUM(monto) as total FROM cobros ${cobrosDateFilterClause}`
        )
        .get() as { total: number | null };
      return result.total || 0;
    };

    const getChartData = () => {
      let groupByClause = "";
      let chartDataKey = "period";

      switch (period) {
        case "year":
          groupByClause = "strftime('%Y-%m', fecha)";
          break;
        case "month":
          groupByClause = "strftime('%Y-%m-%d', fecha)";
          break;
        case "week":
        default:
          groupByClause = "strftime('%Y-%m-%d', fecha)";
          break;
      }

      const result = db
        .prepare(
          `
                SELECT
                    ${groupByClause} as ${chartDataKey},
                    SUM(monto) as revenue
                FROM cobros
                ${cobrosDateFilterClause}
                GROUP BY ${chartDataKey}
                ORDER BY ${chartDataKey}
            `
        )
        .all() as { [key: string]: string | number; revenue: number }[];

      const monthNames = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];

      return result.map((item) => {
        let name = "";
        const dateValue = item.period as string;
        const dateObj = new Date(dateValue + "T12:00:00");
        if (period === "year") {
          name = monthNames[dateObj.getMonth()];
        } else {
          name = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
        }
        return {
          name: name,
          revenue: item.revenue,
        };
      });
    };

    const getTotalInvoices = () =>
      (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM facturas WHERE estado != 'archivada'`
          )
          .get() as {
          count: number;
        }
      ).count;

    const getUpcomingInvoices = () => {
      return db
        .prepare(
          `
        SELECT 
          f.id, 
          f.numero_factura, 
          f.monto, 
          f.vencimiento, 
          c.name as cliente_name
        FROM facturas f
        JOIN clients c ON f.cliente_id = c.id
        WHERE f.estado = 'pendiente' AND f.vencimiento >= date('now')
        ORDER BY f.vencimiento ASC
        LIMIT 5
      `
        )
        .all();
    };

    const statsData = {
      stats: {
        totalOT: getOtCount(),
        totalClients: getTotalClients(),
        totalInvoices: getTotalInvoices(),
        pendingOT: getOtCount("status IN ('pendiente', 'autorizada')"),
        inProgressOT: getOtCount("status IN ('en_progreso', 'pausada')"),
        completedOT: getOtCount("status = 'finalizada'"),
        billedOT: getOtCount("status = 'facturada'"),
        totalRevenue: getTotalRevenue(),
        paidInvoices: getOtCount("status = 'cerrada'"),
        overdueInvoices: getOverdueInvoices(),
      },
      recentOrders: db
        .prepare(
          `
                SELECT ot.id, ot.product, ot.status, ot.date, c.name as client_name 
                FROM work_orders ot 
                JOIN clients c ON ot.client_id = c.id 
                ORDER BY ot.created_at DESC LIMIT 5
            `
        )
        .all(),
      monthlyRevenue: getChartData(),
      upcomingInvoices: getUpcomingInvoices(),
    };
    res.status(200).json(statsData);
  } catch (error) {
    console.error("Error en /dashboard/stats:", error);
    res.status(500).json({ error: "Error al obtener las estadísticas." });
  }
});

export default router;
