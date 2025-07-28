// RUTA: /servidor/src/config/database.ts

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("laboratorio.db");
db.pragma("foreign_keys = ON");

// --- CREACIÓN DE TABLAS CORREGIDA Y FINAL ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    email TEXT UNIQUE NOT NULL, 
    password TEXT NOT NULL, 
    name TEXT NOT NULL,
    -- CORREGIDO: Rol simplificado a "administrador"
    role TEXT NOT NULL CHECK (role IN ('empleado', 'director', 'administracion', 'administrador')),
    points REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    name TEXT NOT NULL, 
    code TEXT UNIQUE NOT NULL, 
    address TEXT, 
    fiscal_id_type TEXT, 
    fiscal_id TEXT
  );
  
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    type TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS work_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    custom_id TEXT UNIQUE,
    date TEXT NOT NULL, 
    type TEXT NOT NULL, 
    client_id INTEGER NOT NULL,
    contract TEXT, 
    product TEXT NOT NULL, 
    brand TEXT,
    model TEXT,
    seal_number TEXT,
    observations TEXT,
    certificate_expiry TEXT,
    collaborator_observations TEXT,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'autorizada', 'en_progreso', 'pausada', 'finalizada', 'facturada', 'cierre')),
    created_by INTEGER NOT NULL, 
    assigned_to INTEGER,
    quotation_amount REAL,
    quotation_details TEXT,
    disposition TEXT,
    authorized BOOLEAN NOT NULL DEFAULT FALSE,
    started_at DATETIME,
    completed_at DATETIME,
    paused_at DATETIME,
    total_pause_duration INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  );
  
  CREATE TABLE IF NOT EXISTS work_order_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    activity TEXT NOT NULL,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
  );
`);

// --- Lógica de Usuario Admin ---
const adminEmail = "admin@laboratorio.com";
const adminCheckStmt = db.prepare("SELECT id FROM users WHERE email = ?");
if (!adminCheckStmt.get(adminEmail)) {
  const adminPassword = "admin123";
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  db.prepare(
    "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)"
  ).run(
    adminEmail,
    hashedPassword,
    "Administrador", // Nombre actualizado
    "administrador" // Rol simplificado
  );
}

export default db;
