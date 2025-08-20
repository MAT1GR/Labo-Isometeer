"use strict";
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
exports.setClients = exports.getClients = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = __importDefault(require("./config/database"));
const facturacion_routes_1 = __importDefault(require("./routes/facturacion.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const clients_routes_1 = __importDefault(require("./routes/clients.routes"));
const work_orders_routes_1 = __importDefault(require("./routes/work_orders.routes"));
const ots_routes_1 = __importDefault(require("./routes/ots.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const contracts_routes_1 = __importDefault(require("./routes/contracts.routes"));
const statistics_routes_1 = __importDefault(require("./routes/statistics.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const notifications_routes_1 = __importStar(require("./routes/notifications.routes"));
const app = (0, express_1.default)();
const port = 4000;
const uploadsDir = path_1.default.join(__dirname, "../uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir);
}
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express_1.default.static(uploadsDir));
let clients = [];
const getClients = () => clients;
exports.getClients = getClients;
const setClients = (newClients) => {
    clients = newClients;
};
exports.setClients = setClients;
// --- FUNCIÓN PARA MARCAR FACTURAS COMO VENCIDAS ---
const checkOverdueInvoices = () => {
    try {
        // Obtiene la fecha de hoy en formato YYYY-MM-DD
        const today = new Date().toISOString().split("T")[0];
        // 1. Busca facturas que estén 'pendientes' y cuya fecha de vencimiento sea anterior a hoy.
        const invoicesToUpdate = database_1.default
            .prepare("SELECT id, numero_factura FROM facturas WHERE vencimiento < ? AND estado = 'pendiente'")
            .all(today);
        if (invoicesToUpdate.length > 0) {
            console.log(`[INFO] Se encontraron ${invoicesToUpdate.length} facturas para actualizar a 'vencida'.`);
            const invoiceIds = invoicesToUpdate.map((inv) => inv.id);
            // 2. Actualiza todas las facturas encontradas al estado 'vencida' en una sola operación.
            const updateStmt = database_1.default.prepare(`UPDATE facturas SET estado = 'vencida' WHERE id IN (${invoiceIds
                .map(() => "?")
                .join(",")})`);
            updateStmt.run(...invoiceIds);
            // 3. Obtiene los usuarios de administración y dirección para notificarles.
            const usersToNotify = database_1.default
                .prepare("SELECT id FROM users WHERE role IN ('administracion', 'director', 'administrador')")
                .all();
            // 4. Crea y envía una notificación para cada factura vencida a cada usuario relevante.
            for (const invoice of invoicesToUpdate) {
                const message = `La factura N° ${invoice.numero_factura} ha vencido.`;
                for (const user of usersToNotify) {
                    const notificationStmt = database_1.default.prepare("INSERT INTO notifications (user_id, message, ot_id) VALUES (?, ?, ?)");
                    const info = notificationStmt.run(user.id, message, null);
                    const newNotification = database_1.default
                        .prepare("SELECT * FROM notifications WHERE id = ?")
                        .get(info.lastInsertRowid);
                    if (newNotification) {
                        (0, notifications_routes_1.sendNotificationToUser)(user.id, newNotification);
                    }
                }
            }
        }
    }
    catch (error) {
        console.error("[ERROR] Verificando facturas vencidas:", error);
    }
};
app.use("/api/auth", auth_routes_1.default);
app.use("/api/users", users_routes_1.default);
app.use("/api/clients", clients_routes_1.default);
app.use("/api/ots", ots_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use("/api/contracts", contracts_routes_1.default);
app.use("/api/statistics", statistics_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/notifications", notifications_routes_1.default);
app.use("/api/facturacion", facturacion_routes_1.default);
app.use("/api/work-orders", work_orders_routes_1.default);
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    // Ejecuta la verificación de facturas vencidas al iniciar el servidor.
    checkOverdueInvoices();
    // Y luego, la ejecuta repetidamente cada hora.
    setInterval(checkOverdueInvoices, 1000 * 60 * 60);
});
