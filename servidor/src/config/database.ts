// RUTA: /servidor/src/config/database.ts

import sqlite3 from "sqlite3";
import { verbose } from "sqlite3";

const sqlite = verbose();
const db = new sqlite.Database("./laboratorio.db", (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log("Connected to the laboratorio database.");
});
db.serialize(() => {
  // Crear tabla de usuarios si no existe
  db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'calidad', 'laboratorio', 'consultor')),
            email TEXT,
            phone TEXT,
            full_name TEXT
        );
    `);

  // Crear tabla de clientes si no existe
  db.exec(`
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            email TEXT UNIQUE,
            cuit TEXT UNIQUE,
            iva_condition TEXT,
            responsable TEXT
        );
    `);

  // Crear tabla de contratos si no existe
  db.exec(`
        CREATE TABLE IF NOT EXISTS contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cliente_id INTEGER,
            numero_contrato TEXT NOT NULL,
            fecha_inicio TEXT NOT NULL,
            fecha_fin TEXT NOT NULL,
            monto TEXT NOT NULL,
            estado TEXT NOT NULL,
            filePath TEXT,
            FOREIGN KEY (cliente_id) REFERENCES clientes (id)
        );
    `);

  // Crear tabla de órdenes de trabajo si no existe
  db.exec(`
        CREATE TABLE IF NOT EXISTS work_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ot_number TEXT NOT NULL UNIQUE,
            client_id INTEGER,
            status TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clientes (id)
        );
    `);

  // Crear tabla de notificaciones si no existe
  db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            read BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
    `);

  // Crear tabla de facturas si no existe
  db.exec(`
      CREATE TABLE IF NOT EXISTS facturas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_factura TEXT NOT NULL,
        cliente_id INTEGER,
        monto REAL NOT NULL,
        pagado REAL DEFAULT 0,
        fecha_emision TEXT NOT NULL,
        vencimiento TEXT NOT NULL,
        estado TEXT NOT NULL,
        FOREIGN KEY (cliente_id) REFERENCES clientes (id)
      );
    `);
});
export default db;
