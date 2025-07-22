// RUTA: /servidor/src/server.ts

import express, { Express, Request, Response } from "express";
import cors from "cors";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const app: Express = express();
const port: number = 4000;
app.use(cors());
app.use(express.json());

const db = new Database("laboratorio.db");
db.pragma("foreign_keys = ON");

// --- Creación de Tablas ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('empleado', 'director', 'administrador')));
  CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL, address TEXT, fiscal_id_type TEXT, fiscal_id TEXT, contact TEXT);
  CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, type TEXT, name TEXT, email TEXT, phone TEXT, FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS work_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT, custom_id TEXT UNIQUE, date TEXT NOT NULL, type TEXT NOT NULL, client_id INTEGER NOT NULL,
    contract TEXT, product TEXT NOT NULL, brand TEXT, model TEXT, seal_number TEXT, observations TEXT, certificate_expiry TEXT,
    collaborator_observations TEXT,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'en_progreso', 'finalizada', 'facturada', 'cierre')),
    created_by INTEGER NOT NULL, assigned_to INTEGER, quotation_amount REAL, quotation_details TEXT, disposition TEXT,
    authorized BOOLEAN NOT NULL DEFAULT FALSE,
    started_at DATETIME,
    completed_at DATETIME,
    duration_minutes INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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

const apiRouter = express.Router();

// --- RUTAS DE OT CORREGIDAS ---

// [GET] /api/ots - Modificada para que el empleado solo vea OTs autorizadas
apiRouter.get("/ots", (req: Request, res: Response) => {
  try {
    const { assigned_to, role } = req.query;
    let query = `SELECT ot.id, ot.custom_id, ot.date, ot.product, ot.status, ot.authorized, c.name as client_name, u_assigned.name as assigned_to_name FROM work_orders ot JOIN clients c ON ot.client_id = c.id LEFT JOIN users u_assigned ON ot.assigned_to = u_assigned.id`;
    const params: any[] = [];

    let whereClauses: string[] = [];
    if (role === "empleado") {
      whereClauses.push("ot.authorized = 1"); // 1 para TRUE en SQLite
      if (assigned_to) {
        whereClauses.push("ot.assigned_to = ?");
        params.push(assigned_to);
      }
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(" AND ")}`;
    }

    query += " ORDER BY ot.id DESC";
    const ots = db.prepare(query).all(params);
    res.status(200).json(ots);
  } catch (error) {
    console.error("Error en GET /ots:", error);
    res.status(500).json({ error: "Error al obtener las OT." });
  }
});

// [PUT] /api/ots/:id/authorize - Director autoriza una OT
apiRouter.put("/ots/:id/authorize", (req: Request, res: Response) => {
  try {
    const info = db
      .prepare(
        "UPDATE work_orders SET authorized = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(req.params.id);
    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada." });
    const updatedOT = db
      .prepare("SELECT * FROM work_orders WHERE id = ?")
      .get(req.params.id);
    res.status(200).json(updatedOT);
  } catch (error) {
    res.status(500).json({ error: "Error al autorizar la OT." });
  }
});

// [PUT] /api/ots/:id/start - Empleado empieza el trabajo
apiRouter.put("/ots/:id/start", (req: Request, res: Response) => {
  try {
    const info = db
      .prepare(
        "UPDATE work_orders SET status = 'en_progreso', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(req.params.id);
    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada." });
    const updatedOT = db
      .prepare("SELECT * FROM work_orders WHERE id = ?")
      .get(req.params.id);
    res.status(200).json(updatedOT);
  } catch (error) {
    res.status(500).json({ error: "Error al iniciar el trabajo." });
  }
});

// [PUT] /api/ots/:id/stop - Empleado termina el trabajo
apiRouter.put("/ots/:id/stop", (req: Request, res: Response) => {
  try {
    const ot = db
      .prepare("SELECT started_at FROM work_orders WHERE id = ?")
      .get(req.params.id) as { started_at: string };
    if (!ot || !ot.started_at)
      return res.status(400).json({ error: "El trabajo nunca fue iniciado." });

    const startTime = new Date(ot.started_at).getTime();
    const endTime = new Date().getTime();
    const duration_minutes = Math.round((endTime - startTime) / 60000);

    const info = db
      .prepare(
        "UPDATE work_orders SET status = 'finalizada', completed_at = CURRENT_TIMESTAMP, duration_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(duration_minutes, req.params.id);

    if (info.changes === 0)
      return res.status(404).json({ error: "OT no encontrada." });
    const updatedOT = db
      .prepare("SELECT * FROM work_orders WHERE id = ?")
      .get(req.params.id);
    res.status(200).json(updatedOT);
  } catch (error) {
    res.status(500).json({ error: "Error al finalizar el trabajo." });
  }
});

// [PUT] /api/ots/:id - Actualiza una OT
apiRouter.put("/ots/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, ...dataToUpdate } = req.body;
    const ot = db
      .prepare("SELECT status FROM work_orders WHERE id = ?")
      .get(id) as { status: string };

    if (!ot) return res.status(404).json({ error: "OT no encontrada." });

    if (role === "empleado") {
      if (ot.status === "cierre") {
        return res
          .status(403)
          .json({ error: "No puedes editar una OT cerrada." });
      }
      const info = db
        .prepare(
          `UPDATE work_orders SET collaborator_observations = ?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
        )
        .run(dataToUpdate.collaborator_observations, id);
      if (info.changes === 0)
        return res.status(404).json({ error: "OT no encontrada." });
    } else {
      const {
        quotation_amount,
        quotation_details,
        disposition,
        status,
        assigned_to,
      } = dataToUpdate;
      db.prepare(
        `UPDATE work_orders SET quotation_amount=?, quotation_details=?, disposition=?, status=?, assigned_to=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
      ).run(
        quotation_amount,
        quotation_details,
        disposition,
        status,
        assigned_to,
        id
      );

      if (ot.status === "pendiente") {
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
        } = dataToUpdate;
        db.prepare(
          `UPDATE work_orders SET date=?, type=?, contract=?, product=?, brand=?, model=?, seal_number=?, observations=?, certificate_expiry=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
        ).run(
          date,
          type,
          contract,
          product,
          brand,
          model,
          seal_number,
          observations,
          certificate_expiry,
          id
        );
      }
    }

    const updatedOT = db
      .prepare("SELECT * FROM work_orders WHERE id = ?")
      .get(id);
    res.status(200).json(updatedOT);
  } catch (error) {
    console.error("Error en PUT /ots/:id", error);
    res
      .status(500)
      .json({ error: "Error interno del servidor al actualizar la OT." });
  }
});

// --- OTRAS RUTAS (INCLUIDAS COMPLETAS) ---
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
      return res.status(400).json({
        error:
          "No se puede eliminar el usuario porque ha creado Órdenes de Trabajo.",
      });
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
apiRouter.get("/clients", (req: Request, res: Response) => {
  try {
    const clients = db
      .prepare(
        "SELECT c.id, c.name, c.code, (SELECT name FROM contacts WHERE client_id = c.id LIMIT 1) as contact FROM clients c ORDER BY c.name"
      )
      .all();
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener clientes." });
  }
});
apiRouter.post("/clients", (req: Request, res: Response) => {
  const {
    name,
    code,
    address,
    fiscal_id_type,
    fiscal_id,
    contacts = [],
  } = req.body;
  if (!code || !name)
    return res
      .status(400)
      .json({ error: "El Nº Cliente y la Empresa son requeridos." });
  const clientInsertStmt = db.prepare(
    "INSERT INTO clients (name, code, address, fiscal_id_type, fiscal_id) VALUES (?, ?, ?, ?, ?)"
  );
  const contactInsertStmt = db.prepare(
    "INSERT INTO contacts (client_id, type, name, email, phone) VALUES (?, ?, ?, ?, ?)"
  );
  const createTransaction = db.transaction((clientData) => {
    const info = clientInsertStmt.run(
      clientData.name,
      clientData.code,
      clientData.address,
      clientData.fiscal_id_type,
      clientData.fiscal_id
    );
    const clientId = info.lastInsertRowid;
    for (const contact of clientData.contacts) {
      if (contact.type || contact.name || contact.email || contact.phone) {
        contactInsertStmt.run(
          clientId,
          contact.type,
          contact.name,
          contact.email,
          contact.phone
        );
      }
    }
    return { id: clientId };
  });
  try {
    const result = createTransaction({
      name,
      code,
      address,
      fiscal_id_type,
      fiscal_id,
      contacts,
    });
    res.status(201).json(result);
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({ error: "El Nº Cliente ya existe." });
    res.status(500).json({ error: "Error al crear el cliente." });
  }
});
apiRouter.get("/clients/:id", (req: Request, res: Response) => {
  try {
    const client = db
      .prepare("SELECT * FROM clients WHERE id = ?")
      .get(req.params.id);
    if (client) {
      const contacts = db
        .prepare("SELECT * FROM contacts WHERE client_id = ?")
        .all(req.params.id);
      res.status(200).json({ ...client, contacts });
    } else {
      res.status(404).json({ error: "Cliente no encontrado." });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el cliente." });
  }
});
apiRouter.put("/clients/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    code,
    address,
    fiscal_id_type,
    fiscal_id,
    contacts = [],
  } = req.body;
  const updateStmt = db.prepare(
    "UPDATE clients SET name=?, code=?, address=?, fiscal_id_type=?, fiscal_id=? WHERE id = ?"
  );
  const deleteContactsStmt = db.prepare(
    "DELETE FROM contacts WHERE client_id = ?"
  );
  const insertContactStmt = db.prepare(
    "INSERT INTO contacts (client_id, type, name, email, phone) VALUES (?, ?, ?, ?, ?)"
  );
  const updateTransaction = db.transaction(() => {
    updateStmt.run(name, code, address, fiscal_id_type, fiscal_id, id);
    deleteContactsStmt.run(id);
    for (const contact of contacts) {
      if (contact.type || contact.name || contact.email || contact.phone) {
        insertContactStmt.run(
          id,
          contact.type,
          contact.name,
          contact.email,
          contact.phone
        );
      }
    }
  });
  try {
    updateTransaction();
    const updatedClient = db
      .prepare("SELECT * FROM clients WHERE id = ?")
      .get(id);
    res.status(200).json(updatedClient);
  } catch (error: any) {
    res.status(500).json({ error: "Error al actualizar el cliente." });
  }
});
apiRouter.delete("/clients/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const info = db.prepare("DELETE FROM clients WHERE id = ?").run(id);
    if (info.changes === 0)
      return res.status(404).json({ error: "Cliente no encontrado." });
    res.status(200).json({ message: "Cliente eliminado con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
apiRouter.post("/clients/bulk-import", (req: Request, res: Response) => {
  const { clients } = req.body;
  if (!Array.isArray(clients)) {
    return res.status(400).json({ error: "Se esperaba un array de clientes." });
  }
  const insert = db.prepare(
    "INSERT OR IGNORE INTO clients (code, name, fiscal_id, contact, address, fiscal_id_type) VALUES (@code, @name, @fiscal_id, @contact, @address, @fiscal_id_type)"
  );
  let importedCount = 0;
  const insertMany = db.transaction((clientList) => {
    for (const client of clientList) {
      if (!client.code || !client.name) continue;
      const result = insert.run(client);
      if (result.changes > 0) importedCount++;
    }
  });
  try {
    insertMany(clients);
    res.status(200).json({
      imported: importedCount,
      duplicates: clients.length - importedCount,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al procesar la importación." });
  }
});
apiRouter.get("/ots/generate-id", (req, res) => {
  try {
    const { date, type, client_id } = req.query;
    if (!date || !type || !client_id)
      return res.status(200).json({ previewId: "Completar campos..." });
    const client = db
      .prepare("SELECT code FROM clients WHERE id = ?")
      .get(client_id as string) as { code: string };
    if (!client) return res.status(200).json({ previewId: "Cliente inválido" });
    const dateObj = new Date(date as string);
    const year = dateObj.getUTCFullYear().toString().slice(-2);
    const month = (dateObj.getUTCMonth() + 1).toString().padStart(2, "0");
    const day = dateObj.getUTCDate().toString().padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;
    const otsTodayCount = (
      db
        .prepare("SELECT COUNT(*) as count FROM work_orders WHERE date = ?")
        .get(date as string) as { count: number }
    ).count;
    const sequentialNumber = otsTodayCount + 1;
    const typeLetter = (type as string).charAt(0).toUpperCase();
    const clientCode = client.code;
    const custom_id = `${datePrefix}${sequentialNumber} ${typeLetter} ${clientCode}`;
    res.status(200).json({ previewId: custom_id });
  } catch (error) {
    res.status(500).json({ error: "Error al generar el ID" });
  }
});
apiRouter.post("/ots", (req, res) => {
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
    const custom_id = `${datePrefix}${sequentialNumber} ${typeLetter} ${clientCode}`;
    const stmt = db.prepare(
      `INSERT INTO work_orders (custom_id, date, type, client_id, created_by, product, brand, model, contract, seal_number, observations, certificate_expiry, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
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
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
apiRouter.get("/ots/:id", (req, res) => {
  try {
    const { id } = req.params;
    const ot = db
      .prepare(
        `SELECT ot.*, c.name as client_name, c.code as client_code FROM work_orders ot JOIN clients c ON ot.client_id = c.id WHERE ot.id = ?`
      )
      .get(id);
    if (!ot) return res.status(404).json({ error: "OT no encontrada." });
    res.status(200).json({ ...ot });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});
apiRouter.delete("/ots/:id", (req, res) => {
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
apiRouter.get("/dashboard/stats", (req, res) => {
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

app.use("/api", apiRouter);
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
