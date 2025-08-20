"use strict";
// RUTA: /servidor/src/routes/work_orders.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// [GET] /api/work-orders - Obtener todas las órdenes de trabajo con filtros
router.get("/", (req, res) => {
    const clientId = req.query.clientId;
    let query = `
      SELECT 
        ot.id, 
        ot.custom_id, 
        ot.name as title, -- CAMBIO CLAVE: Se selecciona 'name' pero se le da el alias 'title'
        c.name as client_name, 
        ot.status, 
        ot.created_at,
        ot.client_id 
      FROM work_orders ot
      JOIN clients c ON ot.client_id = c.id
    `;
    const params = [];
    if (clientId) {
        query += " WHERE ot.client_id = ?";
        params.push(clientId);
    }
    query += " ORDER BY ot.created_at DESC";
    try {
        const workOrders = database_1.default.prepare(query).all(params);
        res.status(200).json(workOrders);
    }
    catch (error) {
        console.error("Error fetching work orders:", error);
        res.status(500).json({ error: "Error al obtener las órdenes de trabajo." });
    }
});
// [GET] /api/work-orders/:id - Obtener una orden de trabajo por ID
router.get("/:id", (req, res) => {
    try {
        const workOrder = database_1.default
            .prepare(`
      SELECT 
        ot.*, 
        c.name as client_name 
      FROM work_orders ot
      JOIN clients c ON ot.client_id = c.id
      WHERE ot.id = ?
    `)
            .get(req.params.id);
        if (workOrder) {
            res.status(200).json(workOrder);
        }
        else {
            res.status(404).json({ error: "Orden de trabajo no encontrada." });
        }
    }
    catch (error) {
        console.error(`Error fetching work order ${req.params.id}:`, error);
        res.status(500).json({ error: "Error al obtener la orden de trabajo." });
    }
});
// [POST] /api/work-orders - Crear una nueva orden de trabajo
router.post("/", (req, res) => {
    const { name, description, client_id, status } = req.body; // Cambiado de 'title' a 'name'
    if (!name || !client_id || !status) {
        return res
            .status(400)
            .json({ error: "Nombre, cliente y estado son requeridos." });
    }
    try {
        const year = new Date().getFullYear();
        const lastWorkOrder = database_1.default
            .prepare("SELECT MAX(CAST(SUBSTR(custom_id, 6) AS INTEGER)) as max_num FROM work_orders WHERE custom_id LIKE ?")
            .get(`${year}-%`);
        const nextNum = ((lastWorkOrder === null || lastWorkOrder === void 0 ? void 0 : lastWorkOrder.max_num) || 0) + 1;
        const custom_id = `${year}-${String(nextNum).padStart(5, "0")}`;
        const info = database_1.default
            .prepare("INSERT INTO work_orders (custom_id, name, description, client_id, status) VALUES (?, ?, ?, ?, ?)" // Cambiado de 'title' a 'name'
        )
            .run(custom_id, name, description, client_id, status);
        res.status(201).json({ id: info.lastInsertRowid, custom_id });
    }
    catch (error) {
        console.error("Error creating work order:", error);
        res.status(500).json({ error: "Error al crear la orden de trabajo." });
    }
});
// [PUT] /api/work-orders/:id - Actualizar una orden de trabajo
router.put("/:id", (req, res) => {
    const { name, description, status } = req.body; // Cambiado de 'title' a 'name'
    if (!name || !status) {
        return res.status(400).json({ error: "Nombre y estado son requeridos." });
    }
    try {
        const info = database_1.default
            .prepare("UPDATE work_orders SET name = ?, description = ?, status = ? WHERE id = ?" // Cambiado de 'title' a 'name'
        )
            .run(name, description, status, req.params.id);
        if (info.changes > 0) {
            res.status(200).json({ message: "Orden de trabajo actualizada." });
        }
        else {
            res.status(404).json({ error: "Orden de trabajo no encontrada." });
        }
    }
    catch (error) {
        console.error(`Error updating work order ${req.params.id}:`, error);
        res.status(500).json({ error: "Error al actualizar la orden de trabajo." });
    }
});
// [DELETE] /api/work-orders/:id - (Sin cambios aquí)
router.delete("/:id", (req, res) => {
    try {
        const info = database_1.default
            .prepare("DELETE FROM work_orders WHERE id = ?")
            .run(req.params.id);
        if (info.changes > 0) {
            res.status(200).json({ message: "Orden de trabajo eliminada." });
        }
        else {
            res.status(404).json({ error: "Orden de trabajo no encontrada." });
        }
    }
    catch (error) {
        console.error(`Error deleting work order ${req.params.id}:`, error);
        res.status(500).json({ error: "Error al eliminar la orden de trabajo." });
    }
});
exports.default = router;
