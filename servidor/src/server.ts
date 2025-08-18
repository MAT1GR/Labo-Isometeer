// RUTA: /servidor/src/server.ts

import express from "express";
import cors from "cors";
import cron from "node-cron";
import userRoutes from "./routes/users.routes";
import db from "./config/database";

import authRoutes from "./routes/auth.routes";
import clientRoutes from "./routes/clients.routes";
import contractRoutes from "./routes/contracts.routes";
import workOrderRoutes from "./routes/work_orders.routes";
import notificationRoutes from "./routes/notifications.routes";
import adminRoutes from "./routes/admin.routes";
import otRoutes from "./routes/ots.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import facturacionRoutes from "./routes/facturacion.routes";

import * as sseService from "./services/sseService";
import statisticsRoutes from "./routes/statistics.routes";

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/work-orders", workOrderRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ots", otRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/facturacion", facturacionRoutes);

// Tarea programada para verificar facturas vencidas
cron.schedule("0 0 * * *", () => {
  console.log(
    "Ejecutando tarea programada: Verificación de facturas vencidas..."
  );
  const today = new Date().toISOString().split("T")[0];

  const selectInvoicesSQL = `SELECT id, numero_factura FROM facturas WHERE vencimiento < ? AND estado = 'pendiente'`;

  db.all(
    selectInvoicesSQL,
    [today],
    (err, invoicesToUpdate: { id: number; numero_factura: string }[]) => {
      if (err) {
        console.error("[CRON] Error fetching pending invoices:", err.message);
        return;
      }

      if (invoicesToUpdate.length === 0) {
        console.log("[CRON] No invoices to update.");
        return;
      }

      invoicesToUpdate.forEach((invoice) => {
        const updateInvoiceSQL = `UPDATE facturas SET estado = 'vencida' WHERE id = ?`;
        db.run(updateInvoiceSQL, [invoice.id], (updateErr) => {
          if (updateErr) {
            console.error(
              `[CRON] Error updating invoice ${invoice.id} to 'vencida':`,
              updateErr.message
            );
            return; // Continue to next invoice
          }

          console.log(
            `[CRON] Invoice ${invoice.numero_factura} status updated to 'vencida'.`
          );

          const selectUsersSQL = `SELECT id FROM users WHERE role = 'admin' OR role = 'consultor'`;
          db.all(
            selectUsersSQL,
            [],
            (userErr, usersToNotify: { id: number }[]) => {
              if (userErr) {
                console.error(
                  "[CRON] Error fetching users to notify:",
                  userErr.message
                );
                return;
              }

              usersToNotify.forEach((user) => {
                const insertNotificationSQL =
                  "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)";
                const params = [
                  user.id,
                  "Factura Vencida",
                  `La factura N° ${invoice.numero_factura} ha vencido.`,
                ];

                // Usamos una función normal para acceder a `this.lastID`
                db.run(insertNotificationSQL, params, function (insertErr) {
                  if (insertErr) {
                    console.error(
                      "[CRON] Error creating notification:",
                      insertErr.message
                    );
                    return;
                  }

                  const newNotificationId = this.lastID;
                  const selectNotificationSQL =
                    "SELECT * FROM notifications WHERE id = ?";
                  db.get(
                    selectNotificationSQL,
                    [newNotificationId],
                    (getErr, newNotification) => {
                      if (getErr) {
                        console.error(
                          "[CRON] Error fetching new notification:",
                          getErr.message
                        );
                        return;
                      }
                      if (newNotification) {
                        sseService.sendToUser(user.id, newNotification);
                        console.log(
                          `[CRON] Notification sent to user ${user.id} for invoice ${invoice.numero_factura}`
                        );
                      }
                    }
                  );
                });
              });
            }
          );
        });
      });
    }
  );
});

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

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);

  checkOverdueInvoices();
  setInterval(checkOverdueInvoices, 1000 * 60 * 60); // Cada 1 hora
});
function checkOverdueInvoices() {
  throw new Error("Function not implemented.");
}
