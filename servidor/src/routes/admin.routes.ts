// RUTA: /servidor/src/routes/admin.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// --- RUTAS PARA ACTIVIDADES Y PUNTAJES ---

// [GET] /api/admin/puntajes
router.get("/puntajes", (req: Request, res: Response) => {
  try {
    const puntajes = db
      .prepare(
        "SELECT id, activity, points FROM activity_points ORDER BY activity"
      )
      .all();
    res.status(200).json(puntajes);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los puntajes." });
  }
});

// [POST] /api/admin/puntajes
router.post("/puntajes", (req: Request, res: Response) => {
  const { activity, points } = req.body;
  if (!activity || points === undefined) {
    return res.status(400).json({
      error: "El nombre y los puntos de la actividad son requeridos.",
    });
  }

  try {
    const info = db
      .prepare("INSERT INTO activity_points (activity, points) VALUES (?, ?)")
      .run(activity, points);
    const newActivity = db
      .prepare("SELECT * FROM activity_points WHERE id = ?")
      .get(info.lastInsertRowid);
    res.status(201).json(newActivity);
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(409)
        .json({ error: "Ya existe una actividad con ese nombre." });
    }
    res.status(500).json({ error: "Error al crear la actividad." });
  }
});

// [PUT] /api/admin/puntajes/:id
router.put("/puntajes/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { activity, points } = req.body;

  if (!activity || points === undefined) {
    return res
      .status(400)
      .json({ error: "El nombre y los puntos son requeridos." });
  }

  try {
    const info = db
      .prepare(
        "UPDATE activity_points SET activity = ?, points = ? WHERE id = ?"
      )
      .run(activity, points, id);
    if (info.changes === 0) {
      return res.status(404).json({ error: "Actividad no encontrada." });
    }
    const updatedActivity = db
      .prepare("SELECT * FROM activity_points WHERE id = ?")
      .get(id);
    res.status(200).json(updatedActivity);
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res
        .status(409)
        .json({ error: "Ya existe otra actividad con ese nombre." });
    }
    res.status(500).json({ error: "Error al actualizar la actividad." });
  }
});

// [DELETE] /api/admin/puntajes/:id
router.delete("/puntajes/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const info = db.prepare("DELETE FROM activity_points WHERE id = ?").run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: "Actividad no encontrada." });
    }
    res.status(200).json({ message: "Actividad eliminada con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar la actividad." });
  }
});

// --- RUTA PARA FAVICON ---

const faviconStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(__dirname, "../../../consultar/public");
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // Sobreescribe siempre el mismo archivo
    cb(null, "logo.ico");
  },
});

const uploadFavicon = multer({ storage: faviconStorage });

router.post("/favicon", uploadFavicon.single("favicon"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No se subió ningún archivo." });
  }
  res.status(200).json({ message: "Favicon actualizado con éxito." });
});

export default router;
