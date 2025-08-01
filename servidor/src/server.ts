// RUTA: /servidor/src/server.ts

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import "./config/database"; // Importamos para que se ejecute la creación de la DB

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/users.routes";
import clientRoutes from "./routes/clients.routes";
import otRoutes from "./routes/ots.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import contractRoutes from "./routes/contracts.routes";

const app = express();
const port = 4000;

// Crear carpeta de uploads si no existe
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'uploads'
app.use("/uploads", express.static(uploadsDir));

// --- Montar Rutas ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/ots", otRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/contracts", contractRoutes);

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
