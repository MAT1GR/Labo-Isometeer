// RUTA: /servidor/src/routes/contracts.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Configuración de Multer para guardar archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = "uploads/";
    // Asegurarse de que el directorio de subida existe
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const contractId = req.params.id;
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `contrato-${contractId}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage });

// [GET] /api/contracts
router.get("/", (req: Request, res: Response) => {
  try {
    const contracts = db.prepare("SELECT * FROM contracts").all();
    res.status(200).json(contracts);
  } catch (error) {
    console.error("Error al obtener contratos:", error);
    res.status(500).json({ error: "Error al obtener los contratos." });
  }
});

// [PUT] /api/contracts/:id
router.put("/:id", upload.single("pdf"), (req: Request, res: Response) => {
  console.log(
    `[LOG] Recibida petición PUT para /api/contracts/${req.params.id}`
  );
  console.log("[LOG] Archivo recibido:", req.file);
  console.log("[LOG] Cuerpo de la petición:", req.body);

  try {
    const { id } = req.params;
    const { content } = req.body;
    const pdfFile = req.file;

    // Obtener el contrato actual para eliminar el archivo antiguo si existe
    console.log(`[LOG] Buscando contrato con ID: ${id}`);
    const currentContract = db
      .prepare("SELECT pdf_path FROM contracts WHERE id = ?")
      .get(id) as { pdf_path?: string };

    if (!currentContract) {
      console.error(`[ERROR] Contrato con ID ${id} no encontrado.`);
      return res
        .status(404)
        .json({ error: "Contrato no encontrado en la base de datos." });
    }
    console.log("[LOG] Contrato actual encontrado:", currentContract);

    let pdf_path = currentContract.pdf_path;

    if (pdfFile) {
      console.log("[LOG] Nuevo archivo PDF detectado:", pdfFile.filename);
      // Si se sube un nuevo PDF, eliminar el anterior si existe
      if (currentContract.pdf_path) {
        const oldPath = path.join(
          __dirname,
          "../../", // Ajusta la ruta para subir un nivel desde 'src/routes' a la raíz del servidor
          currentContract.pdf_path
        );
        console.log("[LOG] Intentando eliminar archivo antiguo:", oldPath);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
          console.log("[LOG] Archivo antiguo eliminado con éxito.");
        } else {
          console.warn(
            "[WARN] El archivo antiguo no existía en la ruta:",
            oldPath
          );
        }
      }
      pdf_path = `uploads/${pdfFile.filename}`;
    }

    console.log(
      `[LOG] Actualizando base de datos con content: "${content}" y pdf_path: "${pdf_path}"`
    );
    const info = db
      .prepare("UPDATE contracts SET content = ?, pdf_path = ? WHERE id = ?")
      .run(content, pdf_path, id);

    console.log("[LOG] Resultado de la actualización en BD:", info);

    if (info.changes === 0) {
      console.error("[ERROR] La actualización no afectó a ninguna fila.");
      return res
        .status(404)
        .json({ error: "No se pudo actualizar el contrato." });
    }

    console.log("[LOG] Contrato actualizado con éxito.");
    res.status(200).json({ message: "Contrato actualizado con éxito." });
  } catch (error) {
    console.error("[ERROR FATAL] Error al actualizar contrato:", error);
    res
      .status(500)
      .json({ error: "Error interno del servidor al actualizar el contrato." });
  }
});

export default router;
