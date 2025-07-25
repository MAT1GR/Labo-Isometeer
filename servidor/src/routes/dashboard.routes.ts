// RUTA: /servidor/src/routes/dashboard.routes.ts

import { Router, Request, Response } from 'express';
import db from '../config/database';

const router = Router();

// [GET] /api/dashboard/stats
router.get('/stats', (req: Request, res: Response) => {
    try {
        const getCount = (table: string, whereClause: string = '1 = 1') => (db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`).get() as { count: number }).count;
        
        const statsData = {
            stats: {
                totalOT: getCount('work_orders'),
                totalClients: getCount('clients'),
                pendingOT: getCount('work_orders', "status = 'pendiente' OR status = 'autorizada'"),
                inProgressOT: getCount('work_orders', "status = 'en_progreso' OR status = 'pausada'"),
                completedOT: getCount('work_orders', "status = 'finalizada'"),
                billedOT: getCount('work_orders', "status = 'facturada'"),
                totalRevenue: 2450000, // Dato simulado
                paidInvoices: 89,       // Dato simulado
                unpaidInvoices: 23,     // Dato simulado
                overdueInvoices: 8,     // Dato simulado
            },
            recentOrders: db.prepare(`
                SELECT ot.id, ot.product, ot.status, ot.date, c.name as client_name 
                FROM work_orders ot 
                JOIN clients c ON ot.client_id = c.id 
                ORDER BY ot.created_at DESC LIMIT 5
            `).all(),
            monthlyRevenue: [
                { month: 'Ene', revenue: 180000 }, { month: 'Feb', revenue: 220000 },
                { month: 'Mar', revenue: 195000 }, { month: 'Abr', revenue: 280000 },
                { month: 'May', revenue: 245000 }, { month: 'Jun', revenue: 310000 },
            ]
        };
        res.status(200).json(statsData);
    } catch (error) {
        console.error("Error en /dashboard/stats:", error);
        res.status(500).json({ error: 'Error al obtener las estadísticas.' });
    }
});

export default router;