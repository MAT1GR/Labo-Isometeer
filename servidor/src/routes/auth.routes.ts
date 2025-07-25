// RUTA: /servidor/src/routes/auth.routes.ts

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import db from "../config/database";

const router = Router();

// [POST] /api/auth/login
router.post("/login", (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ error: "Email y contraseña son requeridos." });

    const userDb = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email) as any;
    if (!userDb || !bcrypt.compareSync(password, userDb.password)) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    const { password: _, ...userToSend } = userDb;
    res.status(200).json(userToSend);
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

export default router;
