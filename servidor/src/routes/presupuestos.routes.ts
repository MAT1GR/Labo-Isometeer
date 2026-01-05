import { Router } from "express";
import db from "../config/database";

const router = Router();

// GET todos los presupuestos
router.get("/", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT p.*, c.name as client_name 
      FROM presupuestos p
      JOIN clients c ON p.cliente_id = c.id
      ORDER BY p.created_at DESC
    `);
    const presupuestos = stmt.all();
    res.json(presupuestos);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET un presupuesto por ID
router.get("/:id", (req, res) => {
  try {
    const stmt = db.prepare("SELECT * FROM presupuestos WHERE id = ?");
    const presupuesto = stmt.get(req.params.id);
    if (presupuesto) {
      res.json(presupuesto);
    } else {
      res.status(404).json({ message: "Presupuesto no encontrado" });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST crear un nuevo presupuesto
router.post("/", (req, res) => {
  const { cliente_id, producto, tipo_servicio, norma, entrega_dias, precio } =
    req.body;
  try {
    const stmt = db.prepare(
      "INSERT INTO presupuestos (cliente_id, producto, tipo_servicio, norma, entrega_dias, precio) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const info = stmt.run(
      cliente_id,
      producto,
      tipo_servicio,
      norma,
      entrega_dias,
      precio
    );
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// PUT autorizar un presupuesto
router.put("/:id/autorizar", (req, res) => {
  try {
    const stmt = db.prepare(
      "UPDATE presupuestos SET autorizado = 1 WHERE id = ?"
    );
    const info = stmt.run(req.params.id);
    if (info.changes > 0) {
      res.json({ message: "Presupuesto autorizado correctamente" });
    } else {
      res.status(404).json({ message: "Presupuesto no encontrado" });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
