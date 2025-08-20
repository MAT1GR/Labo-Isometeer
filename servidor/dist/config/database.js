"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db = new better_sqlite3_1.default("laboratorio.db");
db.pragma("foreign_keys = ON");
// --- MIGRACIÓN AUTOMÁTICA DE LA TABLA 'facturas' ---
const runMigration = () => {
    try {
        // Revisa la estructura actual de la tabla 'facturas'
        const tableInfo = db
            .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='facturas'`)
            .get();
        // Si la tabla existe y en su definición no incluye el estado 'vencida', se ejecuta la migración
        if (tableInfo && tableInfo.sql && !tableInfo.sql.includes("'vencida'")) {
            console.log("[MIGRATION] Estructura de 'facturas' desactualizada. Iniciando migración...");
            db.transaction(() => {
                // 1. Renombrar la tabla vieja
                db.exec("ALTER TABLE facturas RENAME TO facturas_old;");
                console.log("[MIGRATION] Paso 1/4: Tabla renombrada a 'facturas_old'.");
                // 2. Crear la tabla nueva con la estructura correcta
                db.exec(`
            CREATE TABLE facturas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero_factura TEXT NOT NULL,
                monto REAL NOT NULL,
                vencimiento TEXT NOT NULL,
                estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'pagada', 'vencida')),
                cliente_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cliente_id) REFERENCES clients(id) ON DELETE SET NULL
            );
        `);
                console.log("[MIGRATION] Paso 2/4: Nueva tabla 'facturas' creada correctamente.");
                // 3. Copiar todos los datos de la tabla vieja a la nueva
                db.exec(`
            INSERT INTO facturas (id, numero_factura, monto, vencimiento, estado, cliente_id, created_at)
            SELECT id, numero_factura, monto, vencimiento, estado, cliente_id, created_at
            FROM facturas_old;
        `);
                console.log("[MIGRATION] Paso 3/4: Datos copiados a la nueva tabla.");
                // 4. Eliminar la tabla vieja
                db.exec("DROP TABLE facturas_old;");
                console.log("[MIGRATION] Paso 4/4: Tabla antigua eliminada. ¡Migración completada!");
            })();
        }
    }
    catch (error) {
        // Si la tabla 'facturas' no existe, no hace nada, ya que se creará más abajo.
        if (!error.message.includes("no such table")) {
            console.error("[MIGRATION_ERROR] No se pudo migrar la base de datos:", error);
            throw error; // Detiene el servidor si hay un error inesperado en la migración
        }
    }
};
// Ejecutar la lógica de migración antes de cualquier otra cosa
runMigration();
// --- CREACIÓN DE TABLAS (SI NO EXISTEN) ---
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
    client_number TEXT,
    address TEXT, 
    location TEXT,
    province TEXT,
    cp TEXT,
    email TEXT,
    phone TEXT,
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
    contact_id INTEGER, 
    product TEXT NOT NULL, 
    brand TEXT,
    model TEXT,
    seal_number TEXT,
    observations TEXT,
    certificate_expiry TEXT,
    estimated_delivery_date TEXT,
    collaborator_observations TEXT,
    status TEXT NOT NULL DEFAULT 'pendiente',
    created_by INTEGER NOT NULL, 
    quotation_amount REAL,
    quotation_details TEXT,
    disposition TEXT,
    authorized BOOLEAN NOT NULL DEFAULT FALSE,
    contract_type TEXT DEFAULT 'Contrato de Producción',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
  );
  
  CREATE TABLE IF NOT EXISTS work_order_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work_order_id INTEGER NOT NULL,
    activity TEXT NOT NULL,
    norma TEXT,
    precio_sin_iva REAL,
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
  
  CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_factura TEXT NOT NULL,
    monto REAL NOT NULL,
    vencimiento TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'pagada', 'vencida')),
    cliente_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clients(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS factura_ots (
    factura_id INTEGER NOT NULL,
    ot_id INTEGER NOT NULL,
    PRIMARY KEY (factura_id, ot_id),
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    FOREIGN KEY (ot_id) REFERENCES work_orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cobros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id INTEGER NOT NULL,
    monto REAL NOT NULL,
    medio_de_pago TEXT NOT NULL,
    fecha TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    ot_id INTEGER,
    is_read BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (ot_id) REFERENCES work_orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    content TEXT,
    pdf_path TEXT 
  );
  
  CREATE TABLE IF NOT EXISTS activity_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity TEXT UNIQUE NOT NULL,
    points REAL NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS ot_facturas (
            ot_id INTEGER NOT NULL,
            factura_id INTEGER NOT NULL,
            PRIMARY KEY (ot_id, factura_id),
            FOREIGN KEY (ot_id) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
            FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
        )

`);
// --- DATOS INICIALES ---
const seedContracts = () => {
    const contracts = [
        { name: "Contrato de Producción", content: "..." },
        { name: "Contrato de Calibración", content: "..." },
        { name: "Contrato de Ensayo", content: "..." },
    ];
    const stmt = db.prepare("INSERT OR IGNORE INTO contracts (name, content) VALUES (?, ?)");
    contracts.forEach((c) => stmt.run(c.name, c.content));
};
const seedActivityPoints = () => {
    const points = [
        { activity: "Calibracion", points: 1 },
        { activity: "Completo", points: 1 },
        { activity: "Ampliado", points: 0.5 },
        { activity: "Refurbished", points: 0.5 },
        { activity: "Fabricacion", points: 1 },
        { activity: "Verificacion de identidad", points: 0.1 },
        { activity: "Reducido", points: 0.2 },
        { activity: "Servicio tecnico", points: 0.2 },
        { activity: "Capacitacion", points: 1 },
        { activity: "Emision", points: 0 },
    ];
    const stmt = db.prepare("INSERT OR IGNORE INTO activity_points (activity, points) VALUES (?, ?)");
    points.forEach((p) => stmt.run(p.activity, p.points));
};
seedContracts();
seedActivityPoints();
const adminEmail = "admin@laboratorio.com";
const adminCheckStmt = db.prepare("SELECT id FROM users WHERE email = ?");
if (!adminCheckStmt.get(adminEmail)) {
    const adminPassword = "admin123";
    const hashedPassword = bcryptjs_1.default.hashSync(adminPassword, 10);
    db.prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)").run(adminEmail, hashedPassword, "Administrador", "administrador");
}
exports.default = db;
