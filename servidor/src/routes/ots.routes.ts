// RUTA: servidor/src/routes/ots.routes.ts

import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import * as otsController from "../controllers/ots.controller";

const router = Router();

// --- RUTAS DE OBTENCIÓN (GET) ---
router.get("/generate-id", otsController.generateIdHandler);
router.get("/asignadas/:userId", verifyToken, otsController.getMisOts);
router.get("/", otsController.getAllOts);
router.get("/:id", otsController.getOtById);
router.get("/history¬/:id", otsController.getOtHistory);
router.get("/user-summary/:userId", otsController.getUserSummary);
router.get("/cliente/:id", otsController.getOtsByClient);

// --- RUTA DE CREACIÓN (POST) ---
router.post("/", otsController.createOt);

// --- RUTAS DE ACTUALIZACIÓN (PUT) ---
router.put("/:id", otsController.updateOt);
router.put("/:id/authorize", otsController.authorizeOt);
router.put("/:id/deauthorize", otsController.deauthorizeOt);
router.put("/:id/close", otsController.closeOt);
router.put("/activities/:activityId/start", otsController.startActivity);
router.put("/activities/:activityId/stop", otsController.stopActivity);

// --- RUTA DE ELIMINACIÓN (DELETE) ---
router.delete("/:id", otsController.deleteOt);

export default router;
