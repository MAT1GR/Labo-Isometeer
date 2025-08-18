import express, { Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import db from "./config/database";
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
} from "./routes/notifications.routes";

const app = express();
const port = 4000;

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", express.static(uploadsDir));

interface Client {
  id: number;
  res: Response;
}
let clients: Client[] = [];

export const getClients = () => clients;
export const setClients = (newClients: Client[]) => {
  clients = newClients;
};

const checkOverdueInvoices = () => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Encontrar facturas que están pendientes y cuya fecha de vencimiento ya pasó
    const invoicesToUpdate = db
      .prepare(
        "SELECT id, numero_factura FROM facturas WHERE vencimiento < ? AND estado = 'pendiente'"
      )
      .all(today) as { id: number; numero_factura: string }[];

    if (invoicesToUpdate.length > 0) {
      console.log(
        `[INFO] Se encontraron ${invoicesToUpdate.length} facturas para actualizar a 'vencida'.`
      );
      const invoiceIds = invoicesToUpdate.map((inv) => inv.id);

      // 2. Actualizarlas a 'vencida' en una sola transacción
      const updateStmt = db.prepare(
        `UPDATE facturas SET estado = 'vencida' WHERE id IN (${invoiceIds
          .map(() => "?")
          .join(",")})`
      );
      updateStmt.run(...invoiceIds);

      // 3. Obtener los usuarios a notificar (administracion y director)
      const usersToNotify = db
        .prepare(
          "SELECT id FROM users WHERE role IN ('administracion', 'director')"
        )
        .all() as { id: number }[];

      // 4. Crear y enviar notificaciones para cada factura vencida a cada usuario relevante
      for (const invoice of invoicesToUpdate) {
        const message = `La factura N° ${invoice.numero_factura} ha vencido.`;
        for (const user of usersToNotify) {
          const notificationStmt = db.prepare(
            "INSERT INTO notifications (user_id, message, ot_id) VALUES (?, ?, ?)"
          );
          const info = notificationStmt.run(user.id, message, null);
          const newNotification = db
            .prepare("SELECT * FROM notifications WHERE id = ?")
            .get(info.lastInsertRowid);

          if (newNotification) {
            sendNotificationToUser(user.id, newNotification);
          }
        }
      }
    }
  } catch (error) {
    console.error("[ERROR] Verificando facturas vencidas:", error);
  }
};

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

  checkOverdueInvoices();
  setInterval(checkOverdueInvoices, 1000 * 60 * 60); // Cada 1 hora
});
