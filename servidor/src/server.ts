// RUTA: /servidor/src/server.ts

import express, { Express, Request, Response } from "express";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

// --- Configuración Inicial ---
const app: Express = express();
const port: number = 4000;
app.use(cors());
app.use(express.json());

// --- Conexión y Configuración de la Base de Datos ---
const db = new Database("laboratorio.db");
db.pragma("foreign_keys = ON");

// --- Creación/Actualización de Tablas ---
// Borramos las tablas viejas para recrearlas con la nueva estructura
db.exec("DROP TABLE IF EXISTS work_order_items");
db.exec("DROP TABLE IF EXISTS work_orders");
db.exec("DROP TABLE IF EXISTS clients");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('empleado', 'director', 'administrador'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, unique_code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    address TEXT, fiscal_id_type TEXT, fiscal_id TEXT, contact TEXT
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
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'en_progreso', 'finalizada', 'facturada', 'cierre')),
    created_by INTEGER NOT NULL, 
    assigned_to INTEGER,
    quotation_amount REAL,
    quotation_details TEXT,
    disposition TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
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
  ).run(adminEmail, hashedPassword, "Administrador", "administrador");
}

// --- Definición de Rutas de la API ---
const apiRouter = express.Router();

// [POST] /ots - Crea una nueva OT con ID personalizado
apiRouter.post("/ots", (req: Request, res: Response) => {
  try {
    const {
      date,
      type,
      client_id,
      created_by,
      product,
      brand,
      model,
      contract,
      seal_number,
      observations,
      certificate_expiry,
      assigned_to,
    } = req.body;
    const creator = db
      .prepare("SELECT role FROM users WHERE id = ?")
      .get(created_by) as { role: string };
    if (!creator || creator.role === "empleado")
      return res.status(403).json({ error: "Acción no autorizada." });
    if (!date || !type || !client_id || !product)
      return res.status(400).json({ error: "Faltan campos requeridos." });

    const client = db
      .prepare("SELECT code FROM clients WHERE id = ?")
      .get(client_id) as { code: string };
    if (!client)
      return res.status(404).json({ error: "Cliente no encontrado." });

    const dateObj = new Date(date);
    const year = dateObj.getUTCFullYear().toString().slice(-2);
    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = dateObj.getUTCDate().toString().padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;

    const otsTodayCount = (
      db
        .prepare("SELECT COUNT(*) as count FROM work_orders WHERE date = ?")
        .get(date) as { count: number }
    ).count;
    const sequentialNumber = otsTodayCount + 1;

    const typeLetter = type.charAt(0).toUpperCase();
    const clientCode = client.code;
    const custom_id = `${datePrefix}${sequentialNumber}${typeLetter}${clientCode}`;

    const stmt = db.prepare(`
            INSERT INTO work_orders (custom_id, date, type, client_id, created_by, product, brand, model, contract, seal_number, observations, certificate_expiry, assigned_to) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
    const info = stmt.run(
      custom_id,
      date,
      type,
      client_id,
      created_by,
      product,
      brand,
      model,
      contract,
      seal_number,
      observations,
      certificate_expiry,
      assigned_to
    );
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY")
      return res.status(400).json({ error: "El cliente o usuario no existe." });
    console.error("Error en POST /ots:", error);
    res
      .status(500)
      .json({ error: "Error interno del servidor al crear la OT." });
  }
});

// [GET] /ots/:id - Devuelve los detalles de UNA OT
apiRouter.get("/ots/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ot = db
      .prepare(
        `SELECT ot.*, c.name as client_name, c.code as client_code, c.contact as client_contact FROM work_orders ot JOIN clients c ON ot.client_id = c.id WHERE ot.id = ?`
      )
      .get(id);
    if (!ot) return res.status(404).json({ error: "OT no encontrada." });
    res.status(200).json({ ...ot });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// [PUT] /ots/:id - Actualiza una OT
apiRouter.put("/ots/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      date,
      type,
      contract,
      product,
      brand,
      model,
      seal_number,
      observations,
      certificate_expiry,
      status,
      assigned_to,
      quotation_amount,
      quotation_details,
      disposition,
    } = req.body;
    const info = db
      .prepare(
        `UPDATE work_orders SET date=?, type=?, contract=?, product=?, brand=?, model=?, seal_number=?, observations=?, certificate_expiry=?, status=?, assigned_to=?, quotation_amount=?, quotation_details=?, disposition=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
      )
      .run(
        date,
        type,
        contract,
        product,
        brand,
        model,
        seal_number,
        observations,
        certificate_expiry,
        status,
        assigned_to,
        quotation_amount,
        quotation_details,
        disposition,
        id
      );
    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada." });
    const updatedOT = db
      .prepare("SELECT * FROM work_orders WHERE id = ?")
      .get(id);
    res.status(200).json(updatedOT);
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// [GET] /ots - Lista todas las OTs
apiRouter.get("/ots", (req: Request, res: Response) => {
  try {
    const { assigned_to } = req.query;
    let query = `SELECT ot.id, ot.custom_id, ot.date, ot.product, ot.status, c.name as client_name, u_assigned.name as assigned_to_name FROM work_orders ot JOIN clients c ON ot.client_id = c.id LEFT JOIN users u_assigned ON ot.assigned_to = u_assigned.id`;
    const params: string[] = [];
    if (assigned_to) {
      query += " WHERE ot.assigned_to = ?";
      params.push(assigned_to as string);
    }
    query += " ORDER BY ot.id DESC";
    const ots = db.prepare(query).all(params);
    res.status(200).json(ots);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error interno del servidor al obtener las OT." });
  }
});

// --- Otras rutas (Auth, Users, Clients, Dashboard, etc.) ---
apiRouter.post("/auth/login", (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ error: "Email y contraseña son requeridos." });
    const userDb = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as any;
    if (!userDb || !bcrypt.compareSync(password, userDb.password))
      return res.status(401).json({ error: "Credenciales inválidas." });
    const { password: _, ...userToSend } = userDb;
    res.status(200).json(userToSend);
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
apiRouter.get("/users", (req: Request, res: Response) => {
  try {
    const users = db
      .prepare("SELECT id, email, name, role FROM users ORDER BY name")
      .all();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
apiRouter.post("/users", (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name || !role)
      return res
        .status(400)
        .json({ error: "Todos los campos son requeridos." });
    const hashedPassword = bcrypt.hashSync(password, 10);
    const info = db
      .prepare(
        "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)"
      )
      .run(email, hashedPassword, name, role);
    const newUser = db
      .prepare("SELECT id, email, name, role FROM users WHERE id = ?")
      .get(info.lastInsertRowid);
    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({ error: "El email ya está en uso." });
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
apiRouter.delete("/users/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id === "1")
      return res
        .status(403)
        .json({ error: "No se puede eliminar al administrador principal." });
    const info = db.prepare("DELETE FROM users WHERE id = ?").run(id);
    if (info.changes === 0)
      return res.status(404).json({ error: "Usuario no encontrado." });
    res.status(200).json({ message: "Usuario eliminado con éxito." });
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY")
      return res
        .status(400)
        .json({
          error:
            "No se puede eliminar el usuario porque ha creado Órdenes de Trabajo.",
        });
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
apiRouter.get("/clients", (req: Request, res: Response) => {
  try {
    const clients = db.prepare("SELECT * FROM clients ORDER BY name").all();
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener clientes." });
  }
});
apiRouter.post("/clients", (req: Request, res: Response) => {
  try {
    const { code, name, address, fiscal_id_type, fiscal_id, contact } =
      req.body;
    if (!code || !name)
      return res
        .status(400)
        .json({ error: "El código y el nombre son requeridos." });
    const unique_code = `${code}-${Date.now()}`;
    const info = db
      .prepare(
        "INSERT INTO clients (code, unique_code, name, address, fiscal_id_type, fiscal_id, contact) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        code,
        unique_code,
        name,
        address,
        fiscal_id_type,
        fiscal_id,
        contact
      );
    const newClient = db
      .prepare("SELECT * FROM clients WHERE id = ?")
      .get(info.lastInsertRowid);
    res.status(201).json(newClient);
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res
        .status(409)
        .json({ error: "El código del cliente ya existe." });
    res.status(500).json({ error: "Error al crear el cliente." });
  }
});
apiRouter.delete("/clients/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const info = db.prepare("DELETE FROM clients WHERE id = ?").run(id);
    if (info.changes === 0)
      return res.status(404).json({ error: "Cliente no encontrado." });
    res
      .status(200)
      .json({
        message:
          "Cliente y sus Órdenes de Trabajo asociadas han sido eliminados.",
      });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
apiRouter.delete("/ots/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const info = db.prepare("DELETE FROM work_orders WHERE id = ?").run(id);
    if (info.changes === 0)
      return res.status(404).json({ error: "Orden de Trabajo no encontrada." });
    res.status(200).json({ message: "Orden de Trabajo eliminada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
apiRouter.get("/dashboard/stats", (req: Request, res: Response) => {
  try {
    const getCount = (table: string, whereClause: string = "1 = 1") =>
      (
        db
          .prepare(
            `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`
          )
          .get() as { count: number }
      ).count;
    const statsData = {
      stats: {
        totalOT: getCount("work_orders"),
        totalClients: getCount("clients"),
        pendingOT: getCount("work_orders", "status = 'pendiente'"),
        inProgressOT: getCount("work_orders", "status = 'en_progreso'"),
        completedOT: getCount("work_orders", "status = 'finalizada'"),
        billedOT: getCount("work_orders", "status = 'facturada'"),
        totalRevenue: 2450000,
        paidInvoices: 89,
        unpaidInvoices: 23,
        overdueInvoices: 8,
      },
      recentOrders: db
        .prepare(
          `SELECT ot.id, ot.product, ot.status, ot.date, c.name as client_name FROM work_orders ot JOIN clients c ON ot.client_id = c.id ORDER BY ot.created_at DESC LIMIT 5`
        )
        .all(),
    };
    res.status(200).json(statsData);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener las estadísticas." });
  }
});

// --- Montar Rutas e Iniciar Servidor ---
app.use("/api", apiRouter);
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
