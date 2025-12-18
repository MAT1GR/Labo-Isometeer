// RUTA: servidor/src/controllers/ots.controller.ts

import { Request, Response } from "express";
import "../types/express"; // Import to extend the Request interface
import db from "../config/database";
import { Statement } from "better-sqlite3";
import * as otService from "../services/ots.services";
import {
  addHistoryEntry,
  createAndSendNotification,
  generateCustomId,
} from "../helpers/ots.helpers";

// ... (other controllers) ...

export const updateOt = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user) {
      return res.status(401).json({ error: "Usuario no autenticado." });
    }

    const authUserId = req.user.id;
    const authUserRole = req.user.role;
    const { activities, ...mainOtData } = req.body; // Extract activities separately

    // Transform activities to match backend service expectations (User[] to number[])
    const transformedActivities = activities?.map((act: any) => ({
      ...act,
      assigned_to: (act.assigned_users || []).map((u: any) => u.id),
    }));

    // Employee can only update collaborator_observations
    if (authUserRole === "empleado") {
      db.prepare(
        "UPDATE work_orders SET collaborator_observations = ? WHERE id = ?"
      ).run(mainOtData.collaborator_observations, id);
      // For employees, we might also allow them to update their own activities status
      // This is not explicitly handled in original code, but could be added here.
      return res.status(200).json({ message: "Observaciones guardadas." });
    }

    // Admins, Directors, Administracion can update everything
    if (
      !["administrador", "administracion", "director"].includes(authUserRole)
    ) {
      return res
        .status(403)
        .json({ error: "No tienes permisos para editar esta OT." });
    }
    
    // Construct the full OT data for the service layer
    const fullOtDataForService = { ...mainOtData, activities: transformedActivities, user_id: authUserId };

    otService.updateExistingOt(id, fullOtDataForService);
    res.status(200).json({ message: "OT actualizada con éxito." });
  } catch (error: any) {
    console.error("Error al actualizar OT:", error);
    res
      .status(error.message === "OT no encontrada" ? 404 : 500)
      .json({ error: error.message });
  }
};
