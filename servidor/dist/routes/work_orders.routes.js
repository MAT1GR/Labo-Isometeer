"use strict";
// RUTA: servidor/src/routes/work_orders.routes.ts (Corregido)
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const sseService = __importStar(require("../services/sseService")); // <-- CORREGIDO: Se utiliza una importación de espacio de nombres
const router = (0, express_1.Router)();
// Obtener todas las órdenes de trabajo
router.get("/", (req, res) => {
    const { status, type, client_id, creator_id, date_from, date_to, authorized, facturada, } = req.query;
    let baseQuery = `
    SELECT 
      wo.*, 
      c.name as client_name, 
      u.name as creator_name,
      con.name as contact_name,
      CASE 
        WHEN EXISTS (SELECT 1 FROM factura_ots fo WHERE fo.ot_id = wo.id) THEN 1
        ELSE 0
      END as facturada
    FROM work_orders wo
    JOIN clients c ON wo.client_id = c.id
    JOIN users u ON wo.created_by = u.id
    LEFT JOIN contacts con ON wo.contact_id = con.id
  `;
    const whereClauses = [];
    const params = [];
    if (status) {
        whereClauses.push("wo.status = ?");
        params.push(status);
    }
    if (type) {
        whereClauses.push("wo.type = ?");
        params.push(type);
    }
    if (client_id) {
        whereClauses.push("wo.client_id = ?");
        params.push(client_id);
    }
    if (creator_id) {
        whereClauses.push("wo.created_by = ?");
        params.push(creator_id);
    }
    if (date_from) {
        whereClauses.push("wo.date >= ?");
        params.push(date_from);
    }
    if (date_to) {
        whereClauses.push("wo.date <= ?");
        params.push(date_to);
    }
    if (authorized !== undefined) {
        whereClauses.push("wo.authorized = ?");
        params.push(authorized === "true" ? 1 : 0);
    }
    if (whereClauses.length > 0) {
        baseQuery += " WHERE " + whereClauses.join(" AND ");
    }
    // Filtrado por estado de facturación
    if (facturada !== undefined) {
        const havingClause = facturada === "true" ? "HAVING facturada = 1" : "HAVING facturada = 0";
        baseQuery += ` ${havingClause}`;
    }
    baseQuery += " ORDER BY wo.created_at DESC";
    try {
        const workOrders = database_1.default.prepare(baseQuery).all(params);
        res.json(workOrders);
    }
    catch (error) {
        console.error("Error fetching work orders:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});
// Obtener una orden de trabajo por ID
router.get("/:id", (req, res) => {
    try {
        const workOrder = database_1.default
            .prepare(`
      SELECT 
        wo.*, 
        c.name as client_name, 
        u.name as creator_name,
        con.name as contact_name
      FROM work_orders wo
      JOIN clients c ON wo.client_id = c.id
      JOIN users u ON wo.created_by = u.id
      LEFT JOIN contacts con ON wo.contact_id = con.id
      WHERE wo.id = ?
    `)
            .get(req.params.id);
        if (workOrder) {
            const activities = database_1.default
                .prepare(`
        SELECT 
          wa.*, 
          GROUP_CONCAT(u.name) as assigned_users_names
        FROM work_order_activities wa
        LEFT JOIN work_order_activity_assignments waa ON wa.id = waa.activity_id
        LEFT JOIN users u ON waa.user_id = u.id
        WHERE wa.work_order_id = ?
        GROUP BY wa.id
      `)
                .all(req.params.id);
            workOrder.activities = activities;
            res.json(workOrder);
        }
        else {
            res.status(404).json({ message: "Orden de trabajo no encontrada" });
        }
    }
    catch (error) {
        res.status(500).json({ message: "Error al obtener la orden de trabajo" });
    }
});
// Crear una nueva orden de trabajo
router.post("/", (req, res) => {
    const { date, type, client_id, contact_id, product, brand, model, seal_number, observations, certificate_expiry, estimated_delivery_date, created_by, activities, disposition, authorized, contract_type, moneda, } = req.body;
    if (!date || !type || !client_id || !product || !created_by || !activities) {
        return res.status(400).json({ message: "Faltan campos obligatorios" });
    }
    const transaction = database_1.default.transaction(() => {
        // 1. Generar el custom_id
        const year = new Date().getFullYear();
        const lastOT = database_1.default
            .prepare("SELECT custom_id FROM work_orders WHERE custom_id LIKE ? ORDER BY custom_id DESC LIMIT 1")
            .get(`${year}-%`);
        let nextId = 1;
        if (lastOT) {
            const lastIdNumber = parseInt(lastOT.custom_id.split("-")[1], 10);
            nextId = lastIdNumber + 1;
        }
        const customId = `${year}-${String(nextId).padStart(4, "0")}`;
        // 2. Insertar la orden de trabajo principal
        const stmt = database_1.default.prepare(`INSERT INTO work_orders 
        (custom_id, date, type, client_id, contact_id, product, brand, model, seal_number, observations, certificate_expiry, estimated_delivery_date, created_by, disposition, authorized, contract_type, moneda) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        const info = stmt.run(customId, date, type, client_id, contact_id, product, brand, model, seal_number, observations, certificate_expiry, estimated_delivery_date, created_by, disposition, authorized ? 1 : 0, contract_type, moneda || "ARS");
        const workOrderId = info.lastInsertRowid;
        // 3. Insertar las actividades
        const activityStmt = database_1.default.prepare("INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva) VALUES (?, ?, ?, ?)");
        for (const activity of activities) {
            activityStmt.run(workOrderId, activity.activity, activity.norma, activity.precio_sin_iva);
        }
        // 4. Crear notificación
        const directorAndAdminUsers = database_1.default
            .prepare("SELECT id FROM users WHERE role = 'director' OR role = 'administrador'")
            .all();
        const notificationStmt = database_1.default.prepare("INSERT INTO notifications (user_id, message, ot_id) VALUES (?, ?, ?)");
        for (const user of directorAndAdminUsers) {
            if (user.id !== created_by) {
                // No notificar al creador
                notificationStmt.run(user.id, `Se ha creado una nueva OT (${customId}) y requiere tu autorización.`, workOrderId);
            }
        }
        // Enviar evento SSE
        sseService.send({
            type: "ot_created",
            message: `Nueva OT ${customId} creada.`,
            ot_id: workOrderId,
        });
        return { id: workOrderId, custom_id: customId };
    });
    try {
        const result = transaction();
        res.status(201).json(result);
    }
    catch (err) {
        console.error("Error in transaction:", err);
        res.status(500).json({ message: err.message });
    }
});
// Actualizar una orden de trabajo
router.patch("/:id", (req, res) => {
    const { date, type, client_id, contact_id, product, brand, model, seal_number, observations, collaborator_observations, certificate_expiry, estimated_delivery_date, status, disposition, authorized, contract_type, activities, // Array de actividades actualizado
     } = req.body;
    const workOrderId = req.params.id;
    const transaction = database_1.default.transaction(() => {
        // 1. Actualizar la OT principal
        const otFields = {};
        if (date)
            otFields.date = date;
        if (type)
            otFields.type = type;
        if (client_id)
            otFields.client_id = client_id;
        if (contact_id !== undefined)
            otFields.contact_id = contact_id;
        if (product)
            otFields.product = product;
        if (brand !== undefined)
            otFields.brand = brand;
        if (model !== undefined)
            otFields.model = model;
        if (seal_number !== undefined)
            otFields.seal_number = seal_number;
        if (observations !== undefined)
            otFields.observations = observations;
        if (collaborator_observations !== undefined)
            otFields.collaborator_observations = collaborator_observations;
        if (certificate_expiry !== undefined)
            otFields.certificate_expiry = certificate_expiry;
        if (estimated_delivery_date !== undefined)
            otFields.estimated_delivery_date = estimated_delivery_date;
        if (status)
            otFields.status = status;
        if (disposition)
            otFields.disposition = disposition;
        if (authorized !== undefined)
            otFields.authorized = authorized ? 1 : 0;
        if (contract_type)
            otFields.contract_type = contract_type;
        if (Object.keys(otFields).length > 0) {
            const setClause = Object.keys(otFields)
                .map((key) => `${key} = ?`)
                .join(", ");
            const params = [...Object.values(otFields), workOrderId];
            database_1.default.prepare(`UPDATE work_orders SET ${setClause} WHERE id = ?`).run(params);
        }
        // 2. Sincronizar actividades (borrar y recrear es más simple aquí)
        if (activities) {
            database_1.default.prepare("DELETE FROM work_order_activities WHERE work_order_id = ?").run(workOrderId);
            const activityStmt = database_1.default.prepare("INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva, status) VALUES (?, ?, ?, ?, ?)");
            const assignStmt = database_1.default.prepare("INSERT INTO work_order_activity_assignments (activity_id, user_id) VALUES (?, ?)");
            for (const act of activities) {
                const info = activityStmt.run(workOrderId, act.activity, act.norma, act.precio_sin_iva, act.status || "pendiente");
                const activityId = info.lastInsertRowid;
                if (act.assigned_users && act.assigned_users.length > 0) {
                    for (const userId of act.assigned_users) {
                        assignStmt.run(activityId, userId);
                    }
                }
            }
        }
        // Obtener la OT actualizada para la notificación y el SSE
        const updatedOT = database_1.default
            .prepare("SELECT custom_id, created_by FROM work_orders WHERE id = ?")
            .get(workOrderId);
        // 3. Crear notificación si se autoriza
        if (authorized === true) {
            const message = `La OT ${updatedOT.custom_id} ha sido autorizada.`;
            const notificationStmt = database_1.default.prepare("INSERT INTO notifications (user_id, message, ot_id) VALUES (?, ?, ?)");
            // Notificar al creador de la OT
            notificationStmt.run(updatedOT.created_by, message, workOrderId);
            // Enviar evento SSE
            sseService.send({
                type: "ot_authorized",
                message,
                ot_id: workOrderId,
                recipient_id: updatedOT.created_by,
            });
        }
        return database_1.default
            .prepare("SELECT * FROM work_orders WHERE id = ?")
            .get(workOrderId);
    });
    try {
        const updatedWorkOrder = transaction();
        res.json(updatedWorkOrder);
    }
    catch (error) {
        console.error("Error updating work order:", error);
        res
            .status(500)
            .json({ error: "Error interno al actualizar la orden de trabajo." });
    }
});
exports.default = router;
