// RUTA: /servidor/src/routes/admin.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// --- RUTAS PARA PUNTAJES ---

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

// [PUT] /api/admin/puntajes
router.put("/puntajes", (req: Request, res: Response) => {
  const { puntajes } = req.body;
  if (!Array.isArray(puntajes)) {
    return res.status(400).json({ error: "Formato de datos incorrecto." });
  }
  const stmt = db.prepare("UPDATE activity_points SET points = ? WHERE id = ?");
  const updateTransaction = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.points, item.id);
    }
  });

  try {
    updateTransaction(puntajes);
    res.status(200).json({ message: "Puntajes actualizados correctamente." });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar los puntajes." });
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
