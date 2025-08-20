"use strict";
// RUTA: /servidor/src/routes/ots.routes.ts
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
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const notifications_routes_1 = require("./notifications.routes");
const router = (0, express_1.Router)();
// ... (otras funciones como createAndSendNotification y generateCustomId permanecen igual)
const createAndSendNotification = (userId, message, otId) => {
    try {
        const stmt = database_1.default.prepare("INSERT INTO notifications (user_id, message, ot_id) VALUES (?, ?, ?)");
        const info = stmt.run(userId, message, otId);
        const notificationId = info.lastInsertRowid;
        const newNotification = database_1.default
            .prepare("SELECT * FROM notifications WHERE id = ?")
            .get(notificationId);
        if (newNotification) {
            (0, notifications_routes_1.sendNotificationToUser)(userId, newNotification);
        }
    }
    catch (error) {
        console.error("Error al crear o enviar notificación:", error);
    }
};
const generateCustomId = (date, type, client_id) => {
    const client = database_1.default
        .prepare("SELECT code FROM clients WHERE id = ?")
        .get(client_id);
    if (!client)
        throw new Error("Cliente inválido para generar ID");
    const [yearStr, monthStr, dayStr] = date.split("-");
    const year = yearStr.slice(-2);
    const datePrefix = `${year}${monthStr}${dayStr}`;
    const otsOfTheDay = database_1.default
        .prepare("SELECT custom_id FROM work_orders WHERE date = ?")
        .all(date);
    let maxSequential = 0;
    for (const ot of otsOfTheDay) {
        if (ot.custom_id && ot.custom_id.startsWith(datePrefix)) {
            const idWithoutPrefix = ot.custom_id.substring(datePrefix.length);
            const sequentialMatch = idWithoutPrefix.match(/^(\d+)/);
            if (sequentialMatch && sequentialMatch[1]) {
                const currentSequential = parseInt(sequentialMatch[1], 10);
                if (currentSequential > maxSequential) {
                    maxSequential = currentSequential;
                }
            }
        }
    }
    const sequentialNumber = maxSequential + 1;
    const typeInitials = {
        Produccion: "P",
        Calibracion: "C",
        "Ensayo SE": "S",
        "Ensayo EE": "E",
        "Otros Servicios": "O",
    };
    const typeInitial = typeInitials[type] || "?";
    return `${datePrefix}${sequentialNumber} ${typeInitial} ${client.code}`;
};
// [GET] /api/ots
router.get("/", (req, res) => {
    const { role, assigned_to, searchTerm, clientId, assignedToId, status, authorized, } = req.query;
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
        // Lógica de filtros existente
        if (role === "empleado" && assigned_to) {
            whereClauses.push(`ot.id IN (SELECT work_order_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE waa.user_id = ?) AND ot.authorized = 1`);
            params.push(assigned_to);
        }
        else if (Object.keys(req.query).length > 0) {
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
                whereClauses.push(`ot.id IN (SELECT work_order_id FROM work_order_activities wa JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id WHERE waa.user_id = ?)`);
                params.push(assignedToId);
            }
        }
        if (whereClauses.length > 0) {
            query += ` WHERE ${whereClauses.join(" AND ")}`;
        }
        query += " GROUP BY ot.id ORDER BY ot.created_at DESC";
        const ots = database_1.default.prepare(query).all(params);
        res.status(200).json(ots);
    }
    catch (error) {
        console.error("Error en GET /ots:", error);
        res.status(500).json({ error: "Error al obtener las órdenes de trabajo." });
    }
});
// [POST] /api/ots
router.post("/", (req, res) => {
    const _a = req.body, { activities = [], created_by, factura_ids = [] } = _a, otData = __rest(_a, ["activities", "created_by", "factura_ids"]);
    const creator = database_1.default
        .prepare("SELECT role FROM users WHERE id = ?")
        .get(created_by);
    if (!creator ||
        !["administrador", "administracion", "director"].includes(creator.role)) {
        return res
            .status(403)
            .json({ error: "No tienes permisos para crear una OT." });
    }
    const insertOTStmt = database_1.default.prepare(`INSERT INTO work_orders (
      custom_id, date, type, client_id, contact_id, product, brand, model,
      seal_number, observations, certificate_expiry, estimated_delivery_date, collaborator_observations, created_by, status,
      quotation_amount, quotation_details, disposition, contract_type
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertActivityStmt = database_1.default.prepare("INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva) VALUES (?, ?, ?, ?)");
    const insertAssignmentStmt = database_1.default.prepare("INSERT INTO work_order_activity_assignments (activity_id, user_id) VALUES (?, ?)");
    const insertFacturaLinkStmt = database_1.default.prepare("INSERT INTO factura_ots (factura_id, ot_id) VALUES (?, ?)");
    const createTransaction = database_1.default.transaction((data) => {
        const final_custom_id = generateCustomId(data.otData.date, data.otData.type, data.otData.client_id);
        const info = insertOTStmt.run(final_custom_id, data.otData.date, data.otData.type, data.otData.client_id, data.otData.contact_id, data.otData.product, data.otData.brand, data.otData.model, data.otData.seal_number, data.otData.observations, data.otData.certificate_expiry, data.otData.estimated_delivery_date, data.otData.collaborator_observations, data.created_by, "pendiente", data.otData.quotation_amount, data.otData.quotation_details, data.otData.disposition, data.otData.contract_type);
        const otId = info.lastInsertRowid;
        for (const act of data.activities) {
            if (act.activity) {
                const activityInfo = insertActivityStmt.run(otId, act.activity, act.norma, act.precio_sin_iva);
                const activityId = activityInfo.lastInsertRowid;
                if (act.assigned_to && Array.isArray(act.assigned_to)) {
                    for (const userId of act.assigned_to) {
                        insertAssignmentStmt.run(activityId, userId);
                    }
                }
            }
        }
        if (data.factura_ids && Array.isArray(data.factura_ids)) {
            for (const factura_id of data.factura_ids) {
                insertFacturaLinkStmt.run(factura_id, otId);
            }
        }
        return { id: otId };
    });
    try {
        const result = createTransaction({
            otData,
            activities,
            created_by,
            factura_ids,
        });
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
});
// [GET] /api/ots/:id
router.get("/:id", (req, res) => {
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
                .prepare(`
        SELECT f.id, f.numero_factura, f.monto 
        FROM facturas f
        JOIN factura_ots fo ON f.id = fo.factura_id
        WHERE fo.ot_id = ?
      `)
                .all(req.params.id);
            res
                .status(200)
                .json(Object.assign(Object.assign({}, ot), { activities,
                facturas, factura_ids: facturas.map((f) => f.id) }));
        }
        else {
            res.status(404).json({ error: "OT no encontrada." });
        }
    }
    catch (error) {
        res.status(500).json({ error: "Error al obtener la OT." });
    }
});
// [PUT] /api/ots/:id
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const _a = req.body, { activities = [], role, factura_ids = [] } = _a, otData = __rest(_a, ["activities", "role", "factura_ids"]);
    const user = database_1.default
        .prepare("SELECT role FROM users WHERE id = ?")
        .get(otData.user_id);
    if (!user ||
        !["administrador", "administracion", "director"].includes(user.role)) {
        return res
            .status(403)
            .json({ error: "No tienes permisos para editar esta OT." });
    }
    const oldOT = database_1.default
        .prepare("SELECT collaborator_observations, authorized FROM work_orders WHERE id = ?")
        .get(id);
    if (!oldOT) {
        return res.status(404).json({ error: "OT no encontrada" });
    }
    const isAuthorized = oldOT.authorized === 1;
    const oldAssignmentsStmt = database_1.default.prepare(`
     SELECT waa.activity_id, waa.user_id
     FROM work_order_activity_assignments waa
     JOIN work_order_activities wa ON waa.activity_id = wa.id
     WHERE wa.work_order_id = ?
  `);
    const oldAssignments = new Set(oldAssignmentsStmt.all(id).map((a) => `${a.activity_id}-${a.user_id}`));
    if (role === "empleado") {
        const info = database_1.default
            .prepare("UPDATE work_orders SET collaborator_observations = ? WHERE id = ?")
            .run(otData.collaborator_observations, id);
        if (info.changes === 0)
            return res.status(404).json({ error: "OT no encontrada" });
        const newMentions = (otData.collaborator_observations.match(/@(\w+)/g) || []).map((mention) => mention.substring(1));
        const oldMentions = (oldOT.collaborator_observations.match(/@(\w+)/g) || []).map((mention) => mention.substring(1));
        const trulyNewMentions = newMentions.filter((m) => !oldMentions.includes(m));
        if (trulyNewMentions.length > 0) {
            const users = database_1.default
                .prepare(`SELECT id, name FROM users WHERE name IN (${trulyNewMentions
                .map(() => "?")
                .join(",")})`)
                .all(trulyNewMentions);
            for (const mentionedUser of users) {
                const message = `${req.body.userName} te mencionó en la OT #${otData.custom_id}.`;
                createAndSendNotification(mentionedUser.id, message, parseInt(id));
            }
        }
        return res.status(200).json({ message: "Observaciones guardadas." });
    }
    const updateStmt = database_1.default.prepare(`UPDATE work_orders SET date=?, type=?, product=?, brand=?, model=?, seal_number=?, observations=?, certificate_expiry=?, estimated_delivery_date=?, status=?, quotation_amount=?, quotation_details=?, disposition=?, contract_type=?, collaborator_observations=?, contact_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`);
    const deleteActivitiesStmt = database_1.default.prepare("DELETE FROM work_order_activities WHERE work_order_id = ?");
    const insertActivityStmt = database_1.default.prepare("INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva) VALUES (?, ?, ?, ?)");
    const insertAssignmentStmt = database_1.default.prepare("INSERT INTO work_order_activity_assignments (activity_id, user_id) VALUES (?, ?)");
    const deleteFacturaLinksStmt = database_1.default.prepare("DELETE FROM factura_ots WHERE ot_id = ?");
    const insertFacturaLinkStmt = database_1.default.prepare("INSERT INTO factura_ots (factura_id, ot_id) VALUES (?, ?)");
    const updateTransaction = database_1.default.transaction(() => {
        updateStmt.run(otData.date, otData.type, otData.product, otData.brand, otData.model, otData.seal_number, otData.observations, otData.certificate_expiry, otData.estimated_delivery_date, otData.status, otData.quotation_amount, otData.quotation_details, otData.disposition, otData.contract_type, otData.collaborator_observations, otData.contact_id, id);
        deleteActivitiesStmt.run(id);
        for (const act of activities) {
            if (act.activity) {
                const activityInfo = insertActivityStmt.run(id, act.activity, act.norma, act.precio_sin_iva);
                const activityId = activityInfo.lastInsertRowid;
                if (act.assigned_to && Array.isArray(act.assigned_to)) {
                    for (const userId of act.assigned_to) {
                        insertAssignmentStmt.run(activityId, userId);
                        if (isAuthorized &&
                            !oldAssignments.has(`${activityId}-${userId}`)) {
                            const message = `Te han asignado a la actividad "${act.activity}" en la OT #${otData.custom_id}.`;
                            createAndSendNotification(userId, message, parseInt(id));
                        }
                    }
                }
            }
        }
        deleteFacturaLinksStmt.run(id);
        if (factura_ids && Array.isArray(factura_ids)) {
            for (const factura_id of factura_ids) {
                insertFacturaLinkStmt.run(factura_id, id);
            }
        }
        const newMentions = (otData.collaborator_observations.match(/@(\w+)/g) || []).map((mention) => mention.substring(1));
        const oldMentions = (oldOT.collaborator_observations.match(/@(\w+)/g) || []).map((mention) => mention.substring(1));
        const trulyNewMentions = newMentions.filter((m) => !oldMentions.includes(m));
        if (trulyNewMentions.length > 0) {
            const users = database_1.default
                .prepare(`SELECT id, name FROM users WHERE name IN (${trulyNewMentions
                .map(() => "?")
                .join(",")})`)
                .all(trulyNewMentions);
            for (const mentionedUser of users) {
                const message = `Te mencionaron en la OT #${otData.custom_id}.`;
                createAndSendNotification(mentionedUser.id, message, parseInt(id));
            }
        }
    });
    try {
        updateTransaction();
        res.status(200).json({ message: "OT actualizada con éxito." });
    }
    catch (error) {
        res.status(500).json({ error: "Error al actualizar la OT." });
    }
});
// ... (el resto de las rutas como authorize, deauthorize, close, delete, etc., permanecen igual)
router.put("/:id/authorize", (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: "userId es requerido." });
    }
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
        const otId = parseInt(req.params.id);
        const info = database_1.default
            .prepare("UPDATE work_orders SET authorized = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND authorized = 0")
            .run(otId);
        if (info.changes > 0) {
            // Crear Notificación para todos los asignados
            const ot = database_1.default
                .prepare("SELECT custom_id FROM work_orders WHERE id = ?")
                .get(otId);
            const assignedUsers = database_1.default
                .prepare(`
        SELECT DISTINCT waa.user_id
        FROM work_order_activities wa
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        WHERE wa.work_order_id = ?
      `)
                .all(otId);
            if (ot && assignedUsers.length > 0) {
                const message = `La OT #${ot.custom_id} fue autorizada y tienes tareas asignadas.`;
                for (const user of assignedUsers) {
                    createAndSendNotification(user.user_id, message, otId);
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
});
router.put("/:id/deauthorize", (req, res) => {
    try {
        const info = database_1.default
            .prepare("UPDATE work_orders SET authorized = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'pendiente'")
            .run(req.params.id);
        if (info.changes === 0) {
            return res.status(404).json({
                error: "OT no encontrada o no se puede desautorizar porque no está en progreso o finalizada.",
            });
        }
        res.status(200).json({ message: "OT desautorizada con éxito." });
    }
    catch (error) {
        res.status(500).json({ error: "Error al desautorizar la OT." });
    }
});
router.put("/:id/close", (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: "userId es requerido." });
    }
    const closer = database_1.default
        .prepare("SELECT role FROM users WHERE id = ?")
        .get(userId);
    if (!closer || closer.role !== "director") {
        return res
            .status(403)
            .json({ error: "Solo un director puede cerrar OTs." });
    }
    const ot = database_1.default
        .prepare("SELECT * FROM work_orders WHERE id = ?")
        .get(id);
    if (!ot) {
        return res.status(404).json({ error: "OT no encontrada." });
    }
    if (ot.status !== "finalizada") {
        return res.status(400).json({
            error: "La OT debe estar en estado 'finalizada' para poder cerrarse.",
        });
    }
    const getPointsForActivity = (activity) => {
        const row = database_1.default
            .prepare("SELECT points FROM activity_points WHERE activity = ?")
            .get(activity);
        return row ? row.points : 0;
    };
    const closeTransaction = database_1.default.transaction(() => {
        database_1.default.prepare("UPDATE work_orders SET status = 'cerrada', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
        const activities = database_1.default
            .prepare(`
            SELECT wa.activity, waa.user_id
            FROM work_order_activities wa
            JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
            WHERE wa.work_order_id = ?
        `)
            .all(id);
        const pointsToAward = {};
        for (const act of activities) {
            const points = getPointsForActivity(act.activity);
            if (points > 0 && act.user_id) {
                pointsToAward[act.user_id] = (pointsToAward[act.user_id] || 0) + points;
                // Notificar al usuario sobre los puntos ganados
                createAndSendNotification(act.user_id, `Has ganado ${points} puntos por la actividad "${act.activity}" en la OT #${ot.custom_id}.`, ot.id);
            }
        }
        for (const userId in pointsToAward) {
            database_1.default.prepare("UPDATE users SET points = points + ? WHERE id = ?").run(pointsToAward[userId], userId);
        }
        const updatedOT = database_1.default
            .prepare("SELECT * FROM work_orders WHERE id = ?")
            .get(id);
        return updatedOT;
    });
    try {
        const updatedOT = closeTransaction();
        res.status(200).json(updatedOT);
    }
    catch (error) {
        console.error("Error closing OT:", error);
        res.status(500).json({ error: "Error al cerrar la OT." });
    }
});
router.delete("/:id", (req, res) => {
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
});
router.put("/activities/:activityId/start", (req, res) => {
    const { activityId } = req.params;
    const startTransaction = database_1.default.transaction(() => {
        const activity = database_1.default
            .prepare("SELECT work_order_id FROM work_order_activities WHERE id = ? AND status = 'pendiente'")
            .get(activityId);
        if (!activity) {
            throw new Error("La actividad ya fue iniciada o no se encontró.");
        }
        database_1.default.prepare("UPDATE work_order_activities SET status = 'en_progreso', started_at = CURRENT_TIMESTAMP WHERE id = ?").run(activityId);
        const info = database_1.default
            .prepare("UPDATE work_orders SET status = 'en_progreso' WHERE id = ? AND status = 'pendiente'")
            .run(activity.work_order_id);
        // Si el estado de la OT cambió a "en progreso", notificar al creador
        if (info.changes > 0) {
            const ot = database_1.default
                .prepare("SELECT created_by, custom_id FROM work_orders WHERE id = ?")
                .get(activity.work_order_id);
            if (ot) {
                createAndSendNotification(ot.created_by, `La OT #${ot.custom_id} ha comenzado.`, activity.work_order_id);
            }
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
});
router.put("/activities/:activityId/stop", (req, res) => {
    const { activityId } = req.params;
    const stopTransaction = database_1.default.transaction(() => {
        const activity = database_1.default
            .prepare("SELECT * FROM work_order_activities WHERE id = ?")
            .get(activityId);
        if (!activity || activity.status !== "en_progreso") {
            throw new Error("La actividad no está en progreso o no existe.");
        }
        database_1.default.prepare("UPDATE work_order_activities SET status = 'finalizada', completed_at = CURRENT_TIMESTAMP WHERE id = ?").run(activityId);
        const otId = activity.work_order_id;
        const pendingActivities = database_1.default
            .prepare("SELECT COUNT(*) as count FROM work_order_activities WHERE work_order_id = ? AND status != 'finalizada'")
            .get(otId);
        if (pendingActivities.count === 0) {
            database_1.default.prepare("UPDATE work_orders SET status = 'finalizada' WHERE id = ?").run(otId);
            // Notificar al creador que la OT completa ha finalizado
            const ot = database_1.default
                .prepare("SELECT created_by, custom_id FROM work_orders WHERE id = ?")
                .get(otId);
            if (ot) {
                createAndSendNotification(ot.created_by, `Todas las actividades de la OT #${ot.custom_id} han finalizado.`, otId);
            }
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
});
router.get("/user-summary/:userId", (req, res) => {
    try {
        const { userId } = req.params;
        const summary = database_1.default
            .prepare(`
        SELECT
            ot.id,
            ot.custom_id,
            ot.product,
            c.name as client_name,
            ot.date as ot_date,
            wa.activity,
            wa.status
        FROM work_order_activities wa
        JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        JOIN work_orders ot ON wa.work_order_id = ot.id
        JOIN clients c ON ot.client_id = c.id
        WHERE
            waa.user_id = ?
            AND ot.status NOT IN ('facturada', 'cierre', 'cerrada')
            AND ot.authorized = 1
        ORDER BY
            CASE wa.status
                WHEN 'en_progreso' THEN 1
                WHEN 'pendiente' THEN 2
                WHEN 'finalizada' THEN 3
            END,
            ot.date DESC
    `)
            .all(userId);
        res.status(200).json(summary);
    }
    catch (error) {
        console.error("Error fetching user summary data:", error);
        res.status(500).json({ error: "Error al obtener el resumen del usuario." });
    }
});
router.get("/cliente/:id", (req, res) => {
    try {
        const ots = database_1.default
            .prepare(`
        SELECT id, custom_id, product, status 
        FROM work_orders 
        WHERE client_id = ? AND status != 'facturada'
      `)
            .all(req.params.id);
        res.json(ots);
    }
    catch (error) {
        res.status(500).json({ error: "Error al obtener las órdenes de trabajo." });
    }
});
exports.default = router;
