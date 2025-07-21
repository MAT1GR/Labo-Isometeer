// RUTA: /servidor/src/server.ts

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

// --- Configuración Inicial y Conexión a DB (sin cambios) ---
const app: Express = express();
const port: number = 4000;
app.use(cors());
app.use(express.json());
const db = new Database('laboratorio.db');
db.pragma('foreign_keys = ON');

// --- Creación de Tablas (sin cambios) ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('empleado', 'director', 'administrador')));
  CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, unique_code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, address TEXT, fiscal_id_type TEXT, fiscal_id TEXT);
  CREATE TABLE IF NOT EXISTS work_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, type TEXT NOT NULL, client_id INTEGER NOT NULL, contract TEXT, product TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendiente', created_by INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE, FOREIGN KEY (created_by) REFERENCES users(id));
`);
// ON DELETE CASCADE en work_orders->client_id significa que si borras un cliente, sus OTs se borran también.

// --- Lógica de Usuario Admin (sin cambios) ---
// ... (el código de creación de admin se mantiene igual)

// --- Definición de Rutas de la API ---
const apiRouter = express.Router();

// --- Rutas GET y POST existentes (sin cambios) ---
// ... (el código de las rutas existentes se mantiene igual)

// --- NUEVAS RUTAS DELETE ---

// [DELETE] /api/users/:id - Elimina un usuario
apiRouter.delete('/users/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Prevenir que el admin principal se borre a sí mismo
        if (id === '1') {
            return res.status(403).json({ error: 'No se puede eliminar al administrador principal.' });
        }
        const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
        if (info.changes === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        res.status(200).json({ message: 'Usuario eliminado con éxito.' });
    } catch (error: any) {
        if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            return res.status(400).json({ error: 'No se puede eliminar el usuario porque ha creado Órdenes de Trabajo.' });
        }
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// [DELETE] /api/clients/:id - Elimina un cliente
apiRouter.delete('/clients/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const info = db.prepare('DELETE FROM clients WHERE id = ?').run(id);
        if (info.changes === 0) return res.status(404).json({ error: 'Cliente no encontrado.' });
        res.status(200).json({ message: 'Cliente y sus Órdenes de Trabajo asociadas han sido eliminados.' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// [DELETE] /api/ots/:id - Elimina una orden de trabajo
apiRouter.delete('/ots/:id', (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const info = db.prepare('DELETE FROM work_orders WHERE id = ?').run(id);
        if (info.changes === 0) return res.status(404).json({ error: 'Orden de Trabajo no encontrada.' });
        res.status(200).json({ message: 'Orden de Trabajo eliminada con éxito.' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// --- Montar Rutas e Iniciar Servidor ---
app.use('/api', apiRouter);
app.listen(port, () => { console.log(`🚀 Servidor corriendo en http://localhost:${port}`); });

// --- CÓDIGO COMPLETO DE RUTAS EXISTENTES ---
const adminCheckStmt = db.prepare('SELECT id FROM users WHERE email = ?');
if (!adminCheckStmt.get(adminEmail)) { const hashedPassword = bcrypt.hashSync('admin123', 10); db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(adminEmail, hashedPassword, 'Administrador', 'administrador'); }
apiRouter.post('/auth/login', (req, res) => { try { const d=req.body;if(!d.email||!d.password)return res.status(400).json({error:'Email y contraseña son requeridos.'});const u=db.prepare('SELECT * FROM users WHERE email = ?').get(d.email);if(!u||!bcrypt.compareSync(d.password,u.password))return res.status(401).json({error:'Credenciales inválidas.'});const{password:_,...s}=u;res.status(200).json(s)}catch(e){res.status(500).json({error:'Error interno del servidor.'})}});
apiRouter.get('/dashboard/stats', (req, res) => { try { const g=(t,w='1=1')=>(db.prepare(`SELECT COUNT(*) as count FROM ${t} WHERE ${w}`).get() as {count:number}).count;const s={stats:{totalOT:g('work_orders'),totalClients:g('clients'),pendingOT:g('work_orders',"status='pendiente'"),inProgressOT:g('work_orders',"status='en_progreso'"),completedOT:g('work_orders',"status='finalizada'"),billedOT:g('work_orders',"status='facturada'"),totalRevenue:2450000,paidInvoices:89,unpaidInvoices:23,overdueInvoices:8},recentOrders:db.prepare("SELECT ot.id,ot.product,ot.status,ot.date,c.name as client_name FROM work_orders ot JOIN clients c ON ot.client_id=c.id ORDER BY ot.created_at DESC LIMIT 5").all()};res.status(200).json(s)}catch(e){console.error("Error en /dashboard/stats:",e);res.status(500).json({error:'Error al obtener las estadísticas.'})}});
apiRouter.get('/users', (req, res) => { try { const u=db.prepare('SELECT id,email,name,role FROM users ORDER BY name').all();res.status(200).json(u)}catch(e){res.status(500).json({error:'Error interno del servidor.'})}});
apiRouter.post('/users', (req, res) => { try { const d=req.body;if(!d.email||!d.password||!d.name||!d.role)return res.status(400).json({error:'Todos los campos son requeridos.'});const h=bcrypt.hashSync(d.password,10);const i=db.prepare('INSERT INTO users (email,password,name,role) VALUES (?,?,?,?)').run(d.email,h,d.name,d.role);const n=db.prepare('SELECT id,email,name,role FROM users WHERE id = ?').get(i.lastInsertRowid);res.status(201).json(n)}catch(e:any){if(e.code==='SQLITE_CONSTRAINT_UNIQUE')return res.status(409).json({error:'El email ya está en uso.'});res.status(500).json({error:'Error interno del servidor.'})}});
apiRouter.get('/clients', (req, res) => { try { const c=db.prepare('SELECT * FROM clients ORDER BY name').all();res.status(200).json(c)}catch(e){res.status(500).json({error:'Error al obtener clientes.'})}});
apiRouter.post('/clients', (req, res) => { try { const d=req.body;if(!d.code||!d.name)return res.status(400).json({error:'El código y el nombre son requeridos.'});const u=`${d.code}-${Date.now()}`;const i=db.prepare('INSERT INTO clients (code,unique_code,name,address,fiscal_id_type,fiscal_id) VALUES (?,?,?,?,?,?)').run(d.code,u,d.name,d.address,d.fiscal_id_type,d.fiscal_id);const n=db.prepare('SELECT * FROM clients WHERE id = ?').get(i.lastInsertRowid);res.status(201).json(n)}catch(e:any){if(e.code==='SQLITE_CONSTRAINT_UNIQUE')return res.status(409).json({error:'El código del cliente ya existe.'});res.status(500).json({error:'Error al crear el cliente.'})}});
apiRouter.get('/ots', (req, res) => { try { const o=db.prepare("SELECT ot.*,c.name as client_name FROM work_orders ot JOIN clients c ON ot.client_id=c.id ORDER BY ot.created_at DESC").all();res.status(200).json(o)}catch(e){res.status(500).json({error:'Error al obtener OTs.'})}});
apiRouter.post('/ots', (req, res) => { try { const d=req.body;if(!d.date||!d.type||!d.client_id||!d.product||!d.created_by)return res.status(400).json({error:'Faltan campos requeridos.'});const i=db.prepare('INSERT INTO work_orders (date,type,client_id,contract,product,created_by) VALUES (?,?,?,?,?,?)').run(d.date,d.type,d.client_id,d.contract,d.product,d.created_by);const n=db.prepare('SELECT * FROM work_orders WHERE id = ?').get(i.lastInsertRowid);res.status(201).json(n)}catch(e:any){if(e.code==='SQLITE_CONSTRAINT_FOREIGNKEY')return res.status(400).json({error:'El cliente o usuario no existe.'});res.status(500).json({error:'Error al crear la OT.'})}});