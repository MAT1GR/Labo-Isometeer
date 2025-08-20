"use strict";
// RUTA: /servidor/src/routes/statistics.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// [GET] /api/statistics/user/:id
router.get("/user/:id", (req, res) => {
    try {
        const { id } = req.params;
        const user = database_1.default
            .prepare("SELECT id, name, email, role, points FROM users WHERE id = ?")
            .get(id);
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }
        const completedActivities = database_1.default
            .prepare(`
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
    `)
            .all(id);
        const activityCounts = database_1.default
            .prepare(`
        SELECT activity, COUNT(*) as count
        FROM work_order_activities wa
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        WHERE waa.user_id = ? AND wa.status = 'finalizada'
        GROUP BY activity
    `)
            .all(id);
        const totalOTsFinalizadas = database_1.default
            .prepare(`
        SELECT COUNT(DISTINCT wo.id) as count
        FROM work_orders wo
        JOIN work_order_activities wa ON wo.id = wa.work_order_id
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        WHERE waa.user_id = ? AND wo.status IN ('finalizada', 'cerrada')
    `)
            .get(id);
        res.status(200).json({
            user,
            stats: {
                totalPoints: user.points,
                totalCompletedActivities: completedActivities.length,
                totalOTsFinalizadas: totalOTsFinalizadas.count,
            },
            activityDistribution: activityCounts,
            completedWorkOrders: completedActivities,
        });
    }
    catch (error) {
        console.error("Error fetching user statistics:", error);
        res
            .status(500)
            .json({ error: "Error al obtener las estadísticas del usuario." });
    }
});
// [GET] /api/statistics/all
router.get("/all", (req, res) => {
    try {
        // --- Resumen General ---
        const totalOTs = database_1.default.prepare("SELECT COUNT(*) as count FROM work_orders").get().count;
        const totalClients = database_1.default.prepare("SELECT COUNT(*) as count FROM clients").get().count;
        const totalUsers = database_1.default.prepare("SELECT COUNT(*) as count FROM users").get().count;
        const totalRevenue = database_1.default
            .prepare("SELECT SUM(precio_sin_iva) as total FROM work_order_activities")
            .get().total || 0;
        const averageRevenuePerOT = totalOTs > 0 ? totalRevenue / totalOTs : 0;
        // --- Distribuciones ---
        const otsByStatus = database_1.default
            .prepare(`
        SELECT status, COUNT(*) as count 
        FROM work_orders 
        GROUP BY status
    `)
            .all();
        const otsByType = database_1.default
            .prepare(`
        SELECT type, COUNT(*) as count 
        FROM work_orders 
        GROUP BY type
    `)
            .all();
        // --- Rankings ---
        const topClients = database_1.default
            .prepare(`
        SELECT c.name, COUNT(wo.id) as count
        FROM clients c
        JOIN work_orders wo ON c.id = wo.client_id
        GROUP BY c.id
        ORDER BY count DESC
        LIMIT 10
    `)
            .all();
        const topUsersByCompletedOTs = database_1.default
            .prepare(`
        SELECT u.name, COUNT(DISTINCT wa.work_order_id) as count
        FROM users u
        JOIN work_order_activity_assignments waa ON u.id = waa.user_id
        JOIN work_order_activities wa ON waa.activity_id = wa.id
        WHERE wa.status = 'finalizada'
        GROUP BY u.id
        ORDER BY count DESC
        LIMIT 5
    `)
            .all();
        const topActivities = database_1.default
            .prepare(`
        SELECT activity, COUNT(*) as count
        FROM work_order_activities
        GROUP BY activity
        ORDER BY count DESC
        LIMIT 10
    `)
            .all();
        // --- Tendencia de Creación de OTs (Últimos 12 meses) ---
        const otCreationTrend = database_1.default
            .prepare(`
        SELECT strftime('%Y-%m', date) as month, COUNT(id) as count
        FROM work_orders
        WHERE date >= date('now', '-12 months')
        GROUP BY month
        ORDER BY month ASC
    `)
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
    }
    catch (error) {
        console.error("Error fetching statistics:", error);
        res.status(500).json({ error: "Error al obtener las estadísticas." });
    }
});
exports.default = router;
