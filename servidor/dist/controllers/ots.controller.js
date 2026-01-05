"use strict";
// RUTA: servidor/src/controllers/ots.controller.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteOt = exports.stopActivity = exports.startActivity = exports.closeOt = exports.deauthorizeOt = exports.authorizeOt = exports.updateOt = exports.createOt = exports.getOtsByClient = exports.getUserSummary = exports.getOtHistory = exports.getOtById = exports.getAllOts = exports.getMisOts = exports.generateIdHandler = void 0;
exports.addActivityToOt = addActivityToOt;
exports.updateActivity = updateActivity;
exports.getOts = getOts;
exports.getOtsByUser = getOtsByUser;
exports.deleteActivity = deleteActivity;
const database_1 = __importDefault(require("../config/database"));
const otService = __importStar(require("../services/ots.services"));
const ots_helpers_1 = require("../helpers/ots.helpers");
// --- CONTROLADORES GET ---
const generateIdHandler = (req, res) => {
    const { date, type, client_id } = req.query;
    if (!date || !type || !client_id) {
        return res.status(400).json({
            error: "Faltan parámetros (date, type, client_id) para generar el ID.",
        });
    }
    try {
        const customId = (0, ots_helpers_1.generateCustomId)(date, type, client_id);
        res.status(200).json({ custom_id: customId });
    }
    catch (error) {
        res.status(404).json({ error: error.message });
    }
};
exports.generateIdHandler = generateIdHandler;
// CÓDIGO CORREGIDO
const getMisOts = (req, res) => {
    const { userId } = req.params; // <--- TOMA EL ID DEL PARÁMETRO DE LA URL
    if (!userId) {
        return res.status(400).json({ error: "Falta el ID de usuario en la URL." });
    }
    try {
        const query = `
      SELECT
        ot.id, ot.custom_id, ot.product as title, ot.status, ot.authorized,
        c.name as client_name,
        ot.client_id,
        (SELECT GROUP_CONCAT(DISTINCT u.name)
         FROM work_order_activities wa
         JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
         JOIN users u ON waa.user_id = u.id
         WHERE wa.work_order_id = ot.id) as assigned_to_name
      FROM work_orders ot
      LEFT JOIN clients c ON ot.client_id = c.id
      WHERE ot.id IN (
        SELECT DISTINCT wa.work_order_id
        FROM work_order_activities wa
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        WHERE waa.user_id = ?
      ) AND ot.authorized = 1
      GROUP BY ot.id
      ORDER BY ot.created_at DESC
    `;
        const stmt = database_1.default.prepare(query);
        const ots = stmt.all(userId); // Usa el userId de la URL en la consulta
        res.status(200).json(ots);
    }
    catch (error) {
        console.error("Error en GET /ots/asignadas:", error);
        res.status(500).json({ error: "Error al obtener mis órdenes de trabajo." });
    }
};
exports.getMisOts = getMisOts;
const getAllOts = (req, res) => {
    const { role, user_id, searchTerm, clientId, assignedToId, status, authorized, } = req.query;
    try {
        let query = `
      SELECT
        ot.id, ot.custom_id, ot.product as title, ot.status, ot.authorized,
        c.name as client_name,
        ot.client_id,
        (SELECT GROUP_CONCAT(DISTINCT u.name)
         FROM work_order_activities wa
         JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
         JOIN users u ON waa.user_id = u.id
         WHERE wa.work_order_id = ot.id) as assigned_to_name
      FROM work_orders ot
      LEFT JOIN clients c ON ot.client_id = c.id
    `;
        const params = [];
        const whereClauses = [];
        if (role === "empleado" && user_id) {
            whereClauses.push(`ot.id IN (SELECT DISTINCT wa.work_order_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE waa.user_id = ?) AND ot.authorized = 1`);
            params.push(user_id);
        }
        else {
            if (searchTerm) {
                whereClauses.push(`(ot.custom_id LIKE ? OR ot.product LIKE ?)`);
                params.push(`%${searchTerm}%`, `%${searchTerm}%`);
            }
            if (clientId) {
                whereClauses.push(`ot.client_id = ?`);
                params.push(clientId);
            }
            if (status) {
                whereClauses.push(`ot.status = ?`);
                params.push(status);
            }
            if (authorized === "true" || authorized === "false") {
                whereClauses.push(`ot.authorized = ?`);
                params.push(authorized === "true" ? 1 : 0);
            }
            if (assignedToId) {
                whereClauses.push(`ot.id IN (SELECT DISTINCT wa.work_order_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE waa.user_id = ?)`);
                params.push(assignedToId);
            }
        }
        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(" AND ")}`;
        }
        query += " GROUP BY ot.id ORDER BY ot.created_at DESC";
        const stmt = database_1.default.prepare(query);
        const ots = stmt.all(params);
        res.status(200).json(ots);
    }
    catch (error) {
        console.error("Error en GET /ots:", error);
        res.status(500).json({ error: "Error al obtener las órdenes de trabajo." });
    }
};
exports.getAllOts = getAllOts;
const getOtById = (req, res) => {
    try {
        const ot = database_1.default
            .prepare(`SELECT * FROM work_orders WHERE id = ?`)
            .get(req.params.id);
        if (ot) {
            const client = database_1.default
                .prepare("SELECT * FROM clients WHERE id = ?")
                .get(ot.client_id);
            if (client) {
                const contacts = database_1.default
                    .prepare("SELECT * FROM contacts WHERE client_id = ?")
                    .all(ot.client_id);
                ot.client = Object.assign(Object.assign({}, client), { contacts });
            }
            const activities = database_1.default
                .prepare(`SELECT wa.id, wa.activity, wa.norma, wa.precio_sin_iva, wa.status, wa.started_at, wa.completed_at,
           json_group_array(json_object('id', u.id, 'name', u.name)) as assigned_users
           FROM work_order_activities wa
           LEFT JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
           LEFT JOIN users u ON waa.user_id = u.id
           WHERE wa.work_order_id = ?
           GROUP BY wa.id`)
                .all(req.params.id)
                .map((act) => (Object.assign(Object.assign({}, act), { assigned_users: JSON.parse(act.assigned_users).filter((u) => u.id !== null) })));
            const facturas = database_1.default
                .prepare(`SELECT f.id, f.numero_factura, f.monto 
           FROM facturas f
           JOIN factura_ots fo ON f.id = fo.factura_id
           WHERE fo.ot_id = ?`)
                .all(req.params.id);
            res.status(200).json(Object.assign(Object.assign({}, ot), { activities,
                facturas, factura_ids: facturas.map((f) => f.id) }));
        }
        else {
            res.status(404).json({ error: "OT no encontrada." });
        }
    }
    catch (error) {
        res.status(500).json({ error: "Error al obtener la OT." });
    }
};
exports.getOtById = getOtById;
const getOtHistory = (req, res) => {
    const { id } = req.params;
    try {
        const history = database_1.default
            .prepare("SELECT h.*, u.name as username FROM ot_history h LEFT JOIN users u ON u.id = h.user_id WHERE h.ot_id = ? ORDER BY h.changed_at DESC")
            .all(id);
        res.json(history);
    }
    catch (error) {
        console.error("Error al obtener historial:", error);
        res.status(500).json({ error: "Error interno al obtener el historial." });
    }
};
exports.getOtHistory = getOtHistory;
const getUserSummary = (req, res) => {
    const { userId } = req.params;
    try {
        const summary = database_1.default
            .prepare(`
            SELECT ot.id, ot.custom_id, ot.product, c.name as client_name, ot.date as ot_date, wa.activity, wa.status
            FROM work_order_activities wa
            JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
            JOIN work_orders ot ON wa.work_order_id = ot.id
            JOIN clients c ON ot.client_id = c.id
            WHERE waa.user_id = ? AND ot.status NOT IN ('facturada', 'cierre', 'cerrada') AND ot.authorized = 1
            ORDER BY CASE wa.status WHEN 'en_progreso' THEN 1 WHEN 'pendiente' THEN 2 WHEN 'finalizada' THEN 3 END, ot.date DESC
        `)
            .all(userId);
        res.status(200).json(summary);
    }
    catch (error) {
        console.error("Error fetching user summary data:", error);
        res.status(500).json({ error: "Error al obtener el resumen del usuario." });
    }
};
exports.getUserSummary = getUserSummary;
const getOtsByClient = (req, res) => {
    try {
        const ots = database_1.default
            .prepare(`SELECT id, custom_id, product, status FROM work_orders WHERE client_id = ? AND status != 'facturada'`)
            .all(req.params.id);
        res.json(ots);
    }
    catch (error) {
        res.status(500).json({ error: "Error al obtener las órdenes de trabajo." });
    }
};
exports.getOtsByClient = getOtsByClient;
// --- CONTROLADOR POST ---
const createOt = (req, res) => {
    try {
        const { created_by } = req.body;
        const creator = database_1.default
            .prepare("SELECT role FROM users WHERE id = ?")
            .get(created_by);
        if (!creator ||
            !["administrador", "administracion", "director"].includes(creator.role)) {
            return res
                .status(403)
                .json({ error: "No tienes permisos para crear una OT." });
        }
        const result = otService.createNewOt(req.body);
        res.status(201).json(result);
    }
    catch (error) {
        console.error("Error al crear OT:", error);
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res.status(409).json({
                error: "Error de concurrencia: El ID de OT generado ya existe. Inténtelo de nuevo.",
            });
        }
        res.status(500).json({ error: error.message || "Error al crear la OT." });
    }
};
exports.createOt = createOt;
// --- CONTROLADORES PUT ---
const updateOt = (req, res) => {
    try {
        const { id } = req.params;
        const _a = req.body, { role, user_id } = _a, otData = __rest(_a, ["role", "user_id"]);
        if (!user_id)
            return res.status(400).json({ error: "Falta el ID del usuario." });
        const user = database_1.default
            .prepare("SELECT role FROM users WHERE id = ?")
            .get(user_id);
        if (!user)
            return res.status(403).json({ error: "Usuario no encontrado." });
        if (role === "empleado") {
            database_1.default.prepare("UPDATE work_orders SET collaborator_observations = ? WHERE id = ?").run(otData.collaborator_observations, id);
            return res.status(200).json({ message: "Observaciones guardadas." });
        }
        if (!["administrador", "administracion", "director"].includes(user.role)) {
            return res
                .status(403)
                .json({ error: "No tienes permisos para editar esta OT." });
        }
        otService.updateExistingOt(id, req.body);
        res.status(200).json({ message: "OT actualizada con éxito." });
    }
    catch (error) {
        console.error("Error al actualizar OT:", error);
        res
            .status(error.message === "OT no encontrada" ? 404 : 500)
            .json({ error: error.message });
    }
};
exports.updateOt = updateOt;
const authorizeOt = (req, res) => {
    const { userId } = req.body;
    const otId = parseInt(req.params.id);
    if (!userId)
        return res.status(400).json({ error: "userId es requerido." });
    const authorizer = database_1.default
        .prepare("SELECT role FROM users WHERE id = ?")
        .get(userId);
    if (!authorizer ||
        (authorizer.role !== "director" && authorizer.role !== "administrador")) {
        return res
            .status(403)
            .json({ error: "No tienes permisos para autorizar OTs." });
    }
    try {
        const info = database_1.default
            .prepare("UPDATE work_orders SET authorized = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND authorized = 0")
            .run(otId);
        if (info.changes > 0) {
            (0, ots_helpers_1.addHistoryEntry)(otId, userId, ["La OT fue autorizada."]);
            const ot = database_1.default
                .prepare("SELECT custom_id FROM work_orders WHERE id = ?")
                .get(otId);
            const assignedUsers = database_1.default
                .prepare(`SELECT DISTINCT waa.user_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE wa.work_order_id = ?`)
                .all(otId);
            if (ot && assignedUsers.length > 0) {
                const message = `La OT #${ot.custom_id} fue autorizada y tienes tareas asignadas.`;
                for (const user of assignedUsers) {
                    (0, ots_helpers_1.createAndSendNotification)(user.user_id, message, otId);
                }
            }
        }
        else {
            return res
                .status(404)
                .json({ error: "OT no encontrada o ya estaba autorizada." });
        }
        const updatedOT = database_1.default
            .prepare("SELECT * FROM work_orders WHERE id = ?")
            .get(otId);
        res.status(200).json(updatedOT);
    }
    catch (error) {
        res.status(500).json({ error: "Error al autorizar la OT." });
    }
};
exports.authorizeOt = authorizeOt;
const deauthorizeOt = (req, res) => {
    const otId = parseInt(req.params.id);
    const { userId } = req.body;
    try {
        const info = database_1.default
            .prepare("UPDATE work_orders SET authorized = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(otId);
        if (info.changes === 0) {
            return res
                .status(404)
                .json({ error: "OT no encontrada o ya estaba desautorizada." });
        }
        if (userId)
            (0, ots_helpers_1.addHistoryEntry)(otId, userId, ["La autorización de la OT fue revocada."]);
        res.status(200).json({ message: "OT desautorizada con éxito." });
    }
    catch (error) {
        res.status(500).json({ error: "Error al desautorizar la OT." });
    }
};
exports.deauthorizeOt = deauthorizeOt;
const closeOt = (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId)
        return res.status(400).json({ error: "userId es requerido." });
    const closer = database_1.default
        .prepare("SELECT role FROM users WHERE id = ?")
        .get(userId);
    if (!closer || closer.role !== "director") {
        return res
            .status(403)
            .json({ error: "Solo un director puede cerrar OTs." });
    }
    const ot = database_1.default.prepare("SELECT * FROM work_orders WHERE id = ?").get(id);
    if (!ot)
        return res.status(404).json({ error: "OT no encontrada." });
    if (ot.status !== "finalizada")
        return res.status(400).json({
            error: "La OT debe estar en estado 'finalizada' para poder cerrarse.",
        });
    const getPointsForActivity = (activity) => {
        const row = database_1.default
            .prepare("SELECT points FROM activity_points WHERE activity = ?")
            .get(activity);
        return row ? row.points : 0;
    };
    const closeTransaction = database_1.default.transaction(() => {
        database_1.default.prepare("UPDATE work_orders SET status = 'cerrada', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        (0, ots_helpers_1.addHistoryEntry)(parseInt(id), userId, [
            "La OT fue cerrada y los puntos fueron asignados.",
        ]);
        const activities = database_1.default
            .prepare(`SELECT wa.activity, waa.user_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE wa.work_order_id = ?`)
            .all(id);
        const pointsToAward = {};
        for (const act of activities) {
            const points = getPointsForActivity(act.activity);
            if (points > 0 && act.user_id) {
                pointsToAward[act.user_id] = (pointsToAward[act.user_id] || 0) + points;
                (0, ots_helpers_1.createAndSendNotification)(act.user_id, `Has ganado ${points} puntos por la actividad "${act.activity}" en la OT #${ot.custom_id}.`, ot.id);
            }
        }
        for (const userId in pointsToAward) {
            database_1.default.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(pointsToAward[userId], userId);
        }
        return database_1.default.prepare("SELECT * FROM work_orders WHERE id = ?").get(id);
    });
    try {
        const updatedOT = closeTransaction();
        res.status(200).json(updatedOT);
    }
    catch (error) {
        console.error("Error closing OT:", error);
        res.status(500).json({ error: "Error al cerrar la OT." });
    }
};
exports.closeOt = closeOt;
const startActivity = (req, res) => {
    const { activityId } = req.params;
    const { userId } = req.body;
    const startTransaction = database_1.default.transaction(() => {
        const activity = database_1.default
            .prepare("SELECT work_order_id, activity FROM work_order_activities WHERE id = ? AND status = 'pendiente'")
            .get(activityId);
        if (!activity)
            throw new Error("La actividad ya fue iniciada o no se encontró.");
        database_1.default.prepare("UPDATE work_order_activities SET status = 'en_progreso', started_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(activityId);
        if (userId)
            (0, ots_helpers_1.addHistoryEntry)(activity.work_order_id, userId, [
                `Se inició la actividad: "${activity.activity}".`,
            ]);
        const info = database_1.default
            .prepare("UPDATE work_orders SET status = 'en_progreso' WHERE id = ? AND status = 'pendiente'")
            .run(activity.work_order_id);
        if (info.changes > 0) {
            const ot = database_1.default
                .prepare("SELECT created_by, custom_id FROM work_orders WHERE id = ?")
                .get(activity.work_order_id);
            if (ot)
                (0, ots_helpers_1.createAndSendNotification)(ot.created_by, `La OT #${ot.custom_id} ha comenzado.`, activity.work_order_id);
        }
    });
    try {
        startTransaction();
        res.status(200).json({ message: "Actividad iniciada." });
    }
    catch (error) {
        if (error.message.includes("iniciada o no se encontró")) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Error al iniciar la actividad." });
    }
};
exports.startActivity = startActivity;
const stopActivity = (req, res) => {
    const { activityId } = req.params;
    const { userId } = req.body;
    const stopTransaction = database_1.default.transaction(() => {
        const activity = database_1.default
            .prepare("SELECT work_order_id, activity FROM work_order_activities WHERE id = ? AND status = 'en_progreso'")
            .get(activityId);
        if (!activity)
            throw new Error("La actividad no está en progreso o no existe.");
        database_1.default.prepare("UPDATE work_order_activities SET status = 'finalizada', completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(activityId);
        if (userId)
            (0, ots_helpers_1.addHistoryEntry)(activity.work_order_id, userId, [
                `Se finalizó la actividad: "${activity.activity}".`,
            ]);
        const otId = activity.work_order_id;
        const pendingActivities = database_1.default
            .prepare("SELECT COUNT(*) as count FROM work_order_activities WHERE work_order_id = ? AND status != 'finalizada'")
            .get(otId);
        if (pendingActivities.count === 0) {
            database_1.default.prepare("UPDATE work_orders SET status = 'finalizada' WHERE id = ?").run(otId);
            const ot = database_1.default
                .prepare("SELECT created_by, custom_id FROM work_orders WHERE id = ?")
                .get(otId);
            if (ot)
                (0, ots_helpers_1.createAndSendNotification)(ot.created_by, `Todas las actividades de la OT #${ot.custom_id} han finalizado.`, otId);
        }
    });
    try {
        stopTransaction();
        res.status(200).json({ message: "Actividad finalizada." });
    }
    catch (error) {
        if (error.message.includes("en progreso")) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Error al finalizar la actividad." });
    }
};
exports.stopActivity = stopActivity;
// --- CONTROLADOR DELETE ---
const deleteOt = (req, res) => {
    try {
        const { id } = req.params;
        const info = database_1.default.prepare("DELETE FROM work_orders WHERE id = ?").run(id);
        if (info.changes === 0)
            return res.status(404).json({ error: "Orden de Trabajo no encontrada." });
        res.status(200).json({ message: "Orden de Trabajo eliminada con éxito." });
    }
    catch (error) {
        res.status(500).json({ error: "Error interno del servidor." });
    }
};
exports.deleteOt = deleteOt;
function addActivityToOt(arg0, arg1, addActivityToOt) {
    throw new Error("Function not implemented.");
}
function updateActivity(arg0, arg1, updateActivity) {
    throw new Error("Function not implemented.");
}
function getOts(arg0, arg1, getOts) {
    throw new Error("Function not implemented.");
}
function getOtsByUser(arg0, arg1, getOtsByUser) {
    throw new Error("Function not implemented.");
}
function deleteActivity(arg0, arg1, deleteActivity) {
    throw new Error("Function not implemented.");
}
