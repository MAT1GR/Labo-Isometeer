// RUTA: /servidor/src/routes/contracts.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";

const router = Router();

// [GET] /api/contracts
router.get("/", (req: Request, res: Response) => {
  try {
    const contracts = db.prepare("SELECT * FROM contracts").all();
    res.status(200).json(contracts);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener los contratos." });
  }
});

// [PUT] /api/contracts/:id
router.put("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const info = db
      .prepare("UPDATE contracts SET content = ? WHERE id = ?")
      .run(content, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Contrato no encontrado." });
    }
    res.status(200).json({ message: "Contrato actualizado con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar el contrato." });
  }
});

export default router;
