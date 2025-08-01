// RUTA: /servidor/src/config/database.ts

import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("laboratorio.db");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    email TEXT UNIQUE NOT NULL, 
    password TEXT NOT NULL, 
    name TEXT NOT NULL,
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
    product TEXT NOT NULL, 
    brand TEXT,
    model TEXT,
    seal_number TEXT,
    observations TEXT,
    certificate_expiry TEXT,
    collaborator_observations TEXT,
    status TEXT NOT NULL DEFAULT 'pendiente',
    created_by INTEGER NOT NULL, 
    quotation_amount REAL,
    quotation_details TEXT,
    disposition TEXT,
    authorized BOOLEAN NOT NULL DEFAULT FALSE,
    contract_type TEXT DEFAULT 'Contrato de Producción', -- CAMBIO DE NOMBRE
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
  
  CREATE TABLE IF NOT EXISTS work_order_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    activity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'en_progreso', 'finalizada')),
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS work_order_activity_assignments (
    activity_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (activity_id) REFERENCES work_order_activities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    content TEXT,
    pdf_path TEXT 
  );
`);

// Seed contracts if they don't exist
const seedContracts = () => {
  const contracts = [
    {
      name: "Contrato de Producción", // CAMBIO DE NOMBRE
      content:
        "Este es el texto por defecto para el Contrato de Producción. El administrador puede editar este contenido o subir un PDF.",
    },
    {
      name: "Contrato de Calibración",
      content:
        "Este es el texto por defecto para el Contrato de Calibración. El administrador puede editar este contenido o subir un PDF.",
    },
    {
      name: "Contrato de Ensayo",
      content:
        "Este es el texto por defecto para el Contrato de Ensayo. El administrador puede editar este contenido o subir un PDF.",
    },
  ];

  const stmt = db.prepare(
    "INSERT OR IGNORE INTO contracts (name, content) VALUES (?, ?)"
  );
  contracts.forEach((c) => stmt.run(c.name, c.content));
};

seedContracts();

const adminEmail = "admin@laboratorio.com";
const adminCheckStmt = db.prepare("SELECT id FROM users WHERE email = ?");
if (!adminCheckStmt.get(adminEmail)) {
  const adminPassword = "admin123";
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  db.prepare(
    "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)"
  ).run(adminEmail, hashedPassword, "Administrador", "administrador");
}

export default db;
