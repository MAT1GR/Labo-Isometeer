// RUTA: /servidor/src/server.ts

import express, { Response } from "express"; // Import Response type
import cors from "cors";
import path from "path";
import fs from "fs";
import "./config/database";
import facturacionRoutes from "./routes/facturacion.routes";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/users.routes";
import clientRoutes from "./routes/clients.routes";
import workOrderRoutes from "./routes/work_orders.routes";
import otRoutes from "./routes/ots.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import contractRoutes from "./routes/contracts.routes";
import statisticsRoutes from "./routes/statistics.routes";
import adminRoutes from "./routes/admin.routes";
import notificationRoutes, {
  sendNotificationToUser,
} from "./routes/notifications.routes"; // --- CAMBIO: Importamos la nueva función ---

const app = express();
const port = 4000;

// Crear carpeta de uploads si no existe
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Servir archivos estáticos desde la carpeta 'uploads'
app.use("/uploads", express.static(uploadsDir));

// --- INICIO CAMBIO: Manejo de clientes para Server-Sent Events (SSE) ---
interface Client {
  id: number;
  res: Response;
}
let clients: Client[] = [];

// Exportamos las funciones para que puedan ser usadas en otros archivos de rutas
export const getClients = () => clients;
export const setClients = (newClients: Client[]) => {
  clients = newClients;
};
// --- FIN CAMBIO ---

// --- Montar Rutas ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/ots", otRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/facturacion", facturacionRoutes);
app.use("/api/work-orders", workOrderRoutes);

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
