"use strict";
// RUTA: servidor/src/helpers/ots.helpers.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCustomId = exports.createAndSendNotification = exports.addHistoryEntry = void 0;
const database_1 = __importDefault(require("../config/database"));
const notifications_routes_1 = require("../routes/notifications.routes"); // Asegúrate que la ruta sea correcta
/**
 * Registra una nueva entrada en el historial de una OT.
 */
const addHistoryEntry = (otId, userId, changes) => {
    if (!otId || !userId || changes.length === 0)
        return;
    try {
        const stmt = database_1.default.prepare("INSERT INTO ot_history (ot_id, user_id, changes) VALUES (?, ?, ?)");
        stmt.run(otId, userId, JSON.stringify(changes));
    }
    catch (error) {
        console.error("Error al registrar entrada en el historial:", error);
    }
};
exports.addHistoryEntry = addHistoryEntry;
/**
 * Crea una notificación en la BBDD y la envía al usuario.
 */
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
exports.createAndSendNotification = createAndSendNotification;
/**
 * Genera un ID de OT personalizado basado en fecha, tipo y cliente.
 */
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
exports.generateCustomId = generateCustomId;
