"use strict";
// RUTA: servidor/src/services/ots.services.ts
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
exports.updateExistingOt = exports.createNewOt = void 0;
const database_1 = __importDefault(require("../config/database"));
const ots_helpers_1 = require("../helpers/ots.helpers");
/**
 * Servicio para crear una nueva Orden de Trabajo.
 */
const createNewOt = (body) => {
    const { activities = [], created_by, factura_ids = [] } = body, otData = __rest(body, ["activities", "created_by", "factura_ids"]);
    const insertOTStmt = database_1.default.prepare(`INSERT INTO work_orders (
    custom_id, date, type, client_id, contact_id, product, brand, model,
    seal_number, observations, certificate_expiry, estimated_delivery_date, collaborator_observations, created_by, status,
    quotation_amount, quotation_details, disposition, contract_type, moneda
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertActivityStmt = database_1.default.prepare("INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva) VALUES (?, ?, ?, ?)");
    const insertAssignmentStmt = database_1.default.prepare("INSERT INTO work_order_activity_assignments (activity_id, user_id) VALUES (?, ?)");
    const insertFacturaLinkStmt = database_1.default.prepare("INSERT INTO factura_ots (factura_id, ot_id) VALUES (?, ?)");
    const createTransaction = database_1.default.transaction(() => {
        const final_custom_id = (0, ots_helpers_1.generateCustomId)(otData.date, otData.type, otData.client_id);
        const info = insertOTStmt.run(final_custom_id, otData.date, otData.type, otData.client_id, otData.contact_id, otData.product, otData.brand, otData.model, otData.seal_number, otData.observations, otData.certificate_expiry, otData.estimated_delivery_date, otData.collaborator_observations, created_by, "pendiente", otData.quotation_amount, otData.quotation_details, otData.disposition, otData.contract_type, otData.moneda);
        const otId = info.lastInsertRowid;
        for (const act of activities) {
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
        if (factura_ids && Array.isArray(factura_ids)) {
            for (const factura_id of factura_ids) {
                insertFacturaLinkStmt.run(factura_id, otId);
            }
        }
        (0, ots_helpers_1.addHistoryEntry)(otId, created_by, ["Se creó la Orden de Trabajo."]);
        return { id: otId };
    });
    return createTransaction();
};
exports.createNewOt = createNewOt;
/**
 * Servicio para actualizar una Orden de Trabajo existente.
 */
const updateExistingOt = (id, body) => {
    const { activities = [], user_id, factura_ids = [] } = body, otData = __rest(body, ["activities", "user_id", "factura_ids"]);
    const oldOT = database_1.default
        .prepare("SELECT * FROM work_orders WHERE id = ?")
        .get(id);
    if (!oldOT)
        throw new Error("OT no encontrada");
    const updateStmt = database_1.default.prepare(`UPDATE work_orders SET date=?, type=?, product=?, brand=?, model=?, seal_number=?, observations=?, certificate_expiry=?, estimated_delivery_date=?, status=?, quotation_amount=?, quotation_details=?, disposition=?, contract_type=?, collaborator_observations=?, contact_id=?, updated_at=CURRENT_TIMESTAMP, moneda=? WHERE id=?`);
    const deleteActivitiesStmt = database_1.default.prepare("DELETE FROM work_order_activities WHERE work_order_id = ?");
    const insertActivityStmt = database_1.default.prepare("INSERT INTO work_order_activities (work_order_id, activity, norma, precio_sin_iva) VALUES (?, ?, ?, ?)");
    const insertAssignmentStmt = database_1.default.prepare("INSERT INTO work_order_activity_assignments (activity_id, user_id) VALUES (?, ?)");
    const deleteFacturaLinksStmt = database_1.default.prepare("DELETE FROM factura_ots WHERE ot_id = ?");
    const insertFacturaLinkStmt = database_1.default.prepare("INSERT INTO factura_ots (factura_id, ot_id) VALUES (?, ?)");
    const updateTransaction = database_1.default.transaction(() => {
        const changes = [];
        if (oldOT.product !== otData.product)
            changes.push(`Producto cambió de "${oldOT.product || "N/A"}" a "${otData.product || "N/A"}".`);
        if (oldOT.observations !== otData.observations)
            changes.push("Se modificaron las observaciones generales.");
        if (changes.length > 0)
            (0, ots_helpers_1.addHistoryEntry)(parseInt(id), user_id, changes);
        updateStmt.run(otData.date, otData.type, otData.product, otData.brand, otData.model, otData.seal_number, otData.observations, otData.certificate_expiry, otData.estimated_delivery_date, otData.status, otData.quotation_amount, otData.quotation_details, otData.disposition, otData.contract_type, otData.collaborator_observations, otData.contact_id, otData.moneda, id);
        deleteActivitiesStmt.run(id);
        for (const act of activities) {
            if (act.activity) {
                const activityInfo = insertActivityStmt.run(id, act.activity, act.norma, act.precio_sin_iva);
                const activityId = activityInfo.lastInsertRowid;
                if (act.assigned_to && Array.isArray(act.assigned_to)) {
                    for (const userId of act.assigned_to) {
                        insertAssignmentStmt.run(activityId, userId);
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
    });
    updateTransaction();
};
exports.updateExistingOt = updateExistingOt;
