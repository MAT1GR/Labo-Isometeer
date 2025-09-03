// MiApp/servidor/server.js

const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Variable de entorno simple
const PROD = true; // cambia a true cuando estés en producción

const host = PROD ? "192.168.0.150" : "localhost";
const port = PROD ? 6001 : 6001;

// --- Base de Datos ---
const db = new Database("empresa.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        stock INTEGER NOT NULL
    )
`);

// --- API Endpoints ---
app.get("/api/productos", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM productos");
    const productos = stmt.all();
    res.status(200).json(productos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// --- Iniciar Servidor ---
app.listen(port, host, () => {
  console.log(`✅ Servidor escuchando en http://${host}:${port}`);
});
