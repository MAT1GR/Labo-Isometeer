// RUTA: /servidor/src/server.ts

import express from "express";
import cors from "cors";
import "./config/database"; // Importamos para que se ejecute la creación de la DB

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/users.routes";
import clientRoutes from "./routes/clients.routes";
import otRoutes from "./routes/ots.routes";
import dashboardRoutes from "./routes/dashboard.routes"; // Importamos las nuevas rutas de dashboard

const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// --- Montar Rutas ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/ots", otRoutes);
app.use("/api/dashboard", dashboardRoutes); // Usamos las nuevas rutas de dashboard

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
