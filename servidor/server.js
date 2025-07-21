// MiApp/servidor/server.js

const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

// --- Configuración ---
const app = express();
const port = 4000; // El puerto por donde el servidor escuchará
app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json()); // Permite al servidor entender JSON

// --- Base de Datos ---
// Esto crea el archivo 'empresa.db' si no existe
const db = new Database("empresa.db");

// Creamos la tabla 'productos' si no existe
db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        stock INTEGER NOT NULL
    )
`);

// --- API Endpoints (Las "consultas" que podrá hacer el cliente) ---

// Endpoint para obtener todos los productos
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
app.listen(port, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${port}`);
  console.log("Presiona CTRL+C para detener el servidor.");
});
