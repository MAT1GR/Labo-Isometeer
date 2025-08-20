"use strict";
// RUTA: /servidor/src/routes/dashboard.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// [GET] /api/dashboard/stats
router.get("/stats", (req, res) => {
    try {
        const { period = "week" } = req.query;
        let dateFilterClause = "";
        switch (period) {
            case "year":
                dateFilterClause = ` WHERE strftime('%Y', wo.date) = strftime('%Y', 'now')`;
                break;
            case "month":
                dateFilterClause = ` WHERE strftime('%Y-%m', wo.date) = strftime('%Y-%m', 'now')`;
                break;
            case "week":
            default:
                dateFilterClause = ` WHERE wo.date >= date('now', '-6 days')`;
                break;
        }
        const getCount = (table, customWhere = "1 = 1") => {
            const finalWhere = dateFilterClause.replace(/wo\./g, "") + ` AND ${customWhere}`;
            const query = `SELECT COUNT(*) as count FROM ${table} AS wo ${finalWhere}`;
            return database_1.default.prepare(query).get().count;
        };
        const getTotalClients = () => database_1.default.prepare(`SELECT COUNT(*) as count FROM clients`).get().count;
        const getTotalPoints = () => database_1.default.prepare(`SELECT SUM(points) as total FROM users`).get().total || 0;
        const getTotalRevenue = () => {
            const result = database_1.default
                .prepare(`
                SELECT SUM(wa.precio_sin_iva) as total 
                FROM work_order_activities wa
                JOIN work_orders wo ON wa.work_order_id = wo.id
                ${dateFilterClause} AND wo.status = 'cerrada'
             `)
                .get();
            return result.total || 0;
        };
        const getChartData = () => {
            let groupByClause = "";
            let chartDataKey = "period";
            switch (period) {
                case "year":
                    groupByClause = "strftime('%Y-%m', wo.date)";
                    break;
                case "month":
                    groupByClause = "strftime('%Y-%m-%d', wo.date)";
                    break;
                case "week":
                default:
                    groupByClause = "strftime('%Y-%m-%d', wo.date)";
                    break;
            }
            const result = database_1.default
                .prepare(`
                SELECT
                    ${groupByClause} as ${chartDataKey},
                    SUM(wa.precio_sin_iva) as revenue
                FROM work_order_activities wa
                JOIN work_orders wo ON wa.work_order_id = wo.id
                ${dateFilterClause} AND wa.precio_sin_iva > 0 AND wo.status = 'cerrada'
                GROUP BY ${chartDataKey}
                ORDER BY ${chartDataKey}
            `)
                .all();
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
                const dateValue = item.period;
                const dateObj = new Date(dateValue + "T12:00:00");
                if (period === "year") {
                    name = monthNames[dateObj.getMonth()];
                }
                else {
                    name = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                }
                return {
                    name: name,
                    revenue: item.revenue,
                };
            });
        };
        const statsData = {
            stats: {
                totalOT: getCount("work_orders"),
                totalClients: getTotalClients(),
                pendingOT: getCount("work_orders", "status IN ('pendiente', 'autorizada')"),
                inProgressOT: getCount("work_orders", "status IN ('en_progreso', 'pausada')"),
                completedOT: getCount("work_orders", "status = 'finalizada'"),
                billedOT: getCount("work_orders", "status = 'facturada'"),
                totalRevenue: getTotalRevenue(),
                paidInvoices: getCount("work_orders", "status = 'cerrada'"),
                totalPoints: getTotalPoints(),
                overdueInvoices: 0,
            },
            recentOrders: database_1.default
                .prepare(`
                SELECT ot.id, ot.product, ot.status, ot.date, c.name as client_name 
                FROM work_orders ot 
                JOIN clients c ON ot.client_id = c.id 
                ORDER BY ot.created_at DESC LIMIT 5
            `)
                .all(),
            monthlyRevenue: getChartData(),
        };
        res.status(200).json(statsData);
    }
    catch (error) {
        console.error("Error en /dashboard/stats:", error);
        res.status(500).json({ error: "Error al obtener las estadísticas." });
    }
});
exports.default = router;
