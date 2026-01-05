import { Request, Response } from "express";
import db from "../config/database";
import { Statement } from "better-sqlite3";
import * as otService from "../services/ots.services";
import {
  addHistoryEntry,
  createAndSendNotification,
  generateCustomId,
} from "../helpers/ots.helpers";

// Helper to get activities for an OT
const getActivitiesForOt = (otId: number) => {
    return db.prepare(`
        SELECT wa.*, 
        json_group_array(json_object('id', u.id, 'name', u.name)) as assigned_users
        FROM work_order_activities wa
        LEFT JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        LEFT JOIN users u ON waa.user_id = u.id
        WHERE wa.work_order_id = ?
        GROUP BY wa.id
    `).all(otId).map((act: any) => ({
        ...act,
        assigned_users: JSON.parse(act.assigned_users).filter((u: any) => u.id !== null)
    }));
};

export const generateIdHandler = (req: Request, res: Response) => {
    try {
        const { date, type, client_id } = req.query;
        if (!date || !type || !client_id) {
            return res.status(400).json({ error: "Faltan parámetros requeridos (date, type, client_id)" });
        }
        const customId = generateCustomId(String(date), String(type), String(client_id));
        res.json({ custom_id: customId });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getMisOts = (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        // OTs where user is assigned to at least one activity
        const ots = db.prepare(`
            SELECT DISTINCT wo.*, c.name as client_name 
            FROM work_orders wo
            JOIN clients c ON wo.client_id = c.id
            JOIN work_order_activities wa ON wo.id = wa.work_order_id
            JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
            WHERE waa.user_id = ?
        `).all(userId);
        
        // Populate activities for each OT
        const otsWithActivities = ots.map((ot: any) => ({
            ...ot,
            activities: getActivitiesForOt(ot.id)
        }));

        res.json(otsWithActivities);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getAllOts = (req: Request, res: Response) => {
    try {
        const ots = db.prepare(`
            SELECT wo.*, c.name as client_name 
            FROM work_orders wo
            JOIN clients c ON wo.client_id = c.id
            ORDER BY wo.created_at DESC
        `).all();

        const otsWithActivities = ots.map((ot: any) => ({
            ...ot,
            activities: getActivitiesForOt(ot.id)
        }));

        res.json(otsWithActivities);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getOtById = (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const ot = db.prepare(`
            SELECT wo.*, c.name as client_name, c.email as client_email
            FROM work_orders wo
            JOIN clients c ON wo.client_id = c.id
            WHERE wo.id = ?
        `).get(id) as any;

        if (!ot) {
            return res.status(404).json({ error: "OT no encontrada" });
        }

        ot.activities = getActivitiesForOt(ot.id);
        
        const facturas = db.prepare(`
            SELECT f.* FROM facturas f
            JOIN ot_facturas of ON f.id = of.factura_id
            WHERE of.ot_id = ?
        `).all(id);
        ot.facturas = facturas;

        res.json(ot);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getOtHistory = (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        try {
             const history = db.prepare(`
                SELECT h.*, u.name as user_name 
                FROM ot_history h
                JOIN users u ON h.user_id = u.id
                WHERE h.ot_id = ?
                ORDER BY h.timestamp DESC
            `).all(id);
            res.json(history);
        } catch (e: any) {
            if (e.message.includes("no such table")) {
                 res.json([]); 
            } else {
                throw e;
            }
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getUserSummary = (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const summary = db.prepare(`
            SELECT 
                COUNT(CASE WHEN wa.status = 'pendiente' THEN 1 END) as pending,
                COUNT(CASE WHEN wa.status = 'en_progreso' THEN 1 END) as in_progress,
                COUNT(CASE WHEN wa.status = 'finalizada' THEN 1 END) as completed
            FROM work_order_activity_assignments waa
            JOIN work_order_activities wa ON waa.activity_id = wa.id
            WHERE waa.user_id = ?
        `).get(userId);
        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getOtsByClient = (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const ots = db.prepare(`
            SELECT wo.* 
            FROM work_orders wo
            WHERE wo.client_id = ?
            ORDER BY wo.created_at DESC
        `).all(id);
        res.json(ots);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createOt = (req: Request, res: Response) => {
    try {
        const result = otService.createNewOt({ ...req.body, user_id: (req as any).user?.id });
        res.status(201).json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateOt = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!(req as any).user) {
      return res.status(401).json({ error: "Usuario no autenticado." });
    }

    const authUserId = (req as any).user.id;
    const authUserRole = (req as any).user.role;
    const { activities, ...mainOtData } = req.body; 

    const transformedActivities = activities?.map((act: any) => ({
      ...act,
      assigned_to: (act.assigned_users || []).map((u: any) => u.id),
    }));

    if (authUserRole === "empleado") {
      db.prepare(
        "UPDATE work_orders SET collaborator_observations = ? WHERE id = ?"
      ).run(mainOtData.collaborator_observations, id);
      return res.status(200).json({ message: "Observaciones guardadas." });
    }

    if (
      !["administrador", "administracion", "director"].includes(authUserRole)
    ) {
      return res
        .status(403)
        .json({ error: "No tienes permisos para editar esta OT." });
    }
    
    const fullOtDataForService = { ...mainOtData, activities: transformedActivities, user_id: authUserId };

    otService.updateExistingOt(id, fullOtDataForService);
    res.status(200).json({ message: "OT actualizada con éxito." });
  } catch (error: any) {
    console.error("Error al actualizar OT:", error);
    res
      .status(error.message === "OT no encontrada" ? 404 : 500)
      .json({ error: error.message });
  }
};

export const authorizeOt = (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        if (!user || !['director', 'administrador'].includes(user.role)) {
            return res.status(403).json({ error: "No autorizado" });
        }

        db.prepare("UPDATE work_orders SET authorized = 1, status = 'Autorizada' WHERE id = ?").run(id);
        addHistoryEntry(Number(id), user.id, ["OT Autorizada"]);
        res.json({ message: "OT Autorizada" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deauthorizeOt = (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
         if (!user || !['director', 'administrador'].includes(user.role)) {
            return res.status(403).json({ error: "No autorizado" });
        }

        db.prepare("UPDATE work_orders SET authorized = 0, status = 'Pendiente' WHERE id = ?").run(id);
        addHistoryEntry(Number(id), user.id, ["OT Desautorizada"]);
        res.json({ message: "OT Desautorizada" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const closeOt = (req: Request, res: Response) => {
    try {
        const { id } = req.params;
         const user = (req as any).user;

        db.prepare("UPDATE work_orders SET status = 'Finalizada' WHERE id = ?").run(id);
        if (user) addHistoryEntry(Number(id), user.id, ["OT Finalizada/Cerrada"]);
        res.json({ message: "OT Cerrada" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const startActivity = (req: Request, res: Response) => {
    try {
        const { activityId } = req.params;
        db.prepare("UPDATE work_order_activities SET status = 'en_progreso', started_at = CURRENT_TIMESTAMP WHERE id = ?").run(activityId);
        res.json({ message: "Actividad iniciada" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const stopActivity = (req: Request, res: Response) => {
     try {
        const { activityId } = req.params;
        db.prepare("UPDATE work_order_activities SET status = 'finalizada', completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(activityId);
        res.json({ message: "Actividad finalizada" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteOt = (req: Request, res: Response) => {
    try {
        const { id } = req.params;
         const user = (req as any).user;
         if (!user || !['administrador'].includes(user.role)) {
            return res.status(403).json({ error: "No autorizado" });
        }
        
        db.prepare("DELETE FROM work_orders WHERE id = ?").run(id);
        res.json({ message: "OT Eliminada" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};