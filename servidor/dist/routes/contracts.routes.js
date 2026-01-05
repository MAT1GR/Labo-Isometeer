"use strict";
// RUTA: /servidor/src/routes/contracts.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// Configuración de Multer para guardar archivos
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dest = "uploads/";
        // Asegurarse de que el directorio de subida existe
        fs_1.default.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const contractId = req.params.id || `new-${Date.now()}`;
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `contrato-${contractId}-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    },
});
const upload = (0, multer_1.default)({ storage });
// [GET] /api/contracts
router.get("/", (req, res) => {
    try {
        const contracts = database_1.default.prepare("SELECT * FROM contracts ORDER BY name").all();
        res.status(200).json(contracts);
    }
    catch (error) {
        console.error("Error al obtener contratos:", error);
        res.status(500).json({ error: "Error al obtener los contratos." });
    }
});
// [POST] /api/contracts
router.post("/", upload.single("pdf"), (req, res) => {
    const { name } = req.body;
    const pdfFile = req.file;
    if (!name) {
        return res
            .status(400)
            .json({ error: "El nombre del contrato es requerido." });
    }
    try {
        const info = database_1.default
            .prepare("INSERT INTO contracts (name, pdf_path) VALUES (?, ?)")
            .run(name, pdfFile ? `uploads/${pdfFile.filename}` : null);
        const newContract = database_1.default
            .prepare("SELECT * FROM contracts WHERE id = ?")
            .get(info.lastInsertRowid);
        res.status(201).json(newContract);
    }
    catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
            return res
                .status(409)
                .json({ error: "Ya existe un contrato con ese nombre." });
        }
        console.error("Error al crear contrato:", error);
        res.status(500).json({ error: "Error interno al crear el contrato." });
    }
});
// [PUT] /api/contracts/:id
router.put("/:id", upload.single("pdf"), (req, res) => {
    console.log(`[LOG] Recibida petición PUT para /api/contracts/${req.params.id}`);
    console.log("[LOG] Archivo recibido:", req.file);
    console.log("[LOG] Cuerpo de la petición:", req.body);
    try {
        const { id } = req.params;
        const { name } = req.body;
        const pdfFile = req.file;
        if (!name) {
            return res.status(400).json({ error: "El nombre no puede estar vacío." });
        }
        console.log(`[LOG] Buscando contrato con ID: ${id}`);
        const currentContract = database_1.default
            .prepare("SELECT pdf_path FROM contracts WHERE id = ?")
            .get(id);
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
            if (currentContract.pdf_path) {
                const oldPath = path_1.default.join(__dirname, "../../", currentContract.pdf_path);
                console.log("[LOG] Intentando eliminar archivo antiguo:", oldPath);
                if (fs_1.default.existsSync(oldPath)) {
                    fs_1.default.unlinkSync(oldPath);
                    console.log("[LOG] Archivo antiguo eliminado con éxito.");
                }
                else {
                    console.warn("[WARN] El archivo antiguo no existía en la ruta:", oldPath);
                }
            }
            pdf_path = `uploads/${pdfFile.filename}`;
        }
        console.log(`[LOG] Actualizando base de datos con name: "${name}" y pdf_path: "${pdf_path}"`);
        const info = database_1.default
            .prepare("UPDATE contracts SET name = ?, pdf_path = ? WHERE id = ?")
            .run(name, pdf_path, id);
        console.log("[LOG] Resultado de la actualización en BD:", info);
        if (info.changes === 0) {
            console.error("[ERROR] La actualización no afectó a ninguna fila.");
            // Esto puede pasar si los datos son los mismos, así que devolvemos éxito de todos modos.
        }
        const updatedContract = database_1.default
            .prepare("SELECT * FROM contracts WHERE id = ?")
            .get(id);
        console.log("[LOG] Contrato actualizado con éxito.");
        res.status(200).json(updatedContract);
    }
    catch (error) {
        console.error("[ERROR FATAL] Error al actualizar contrato:", error);
        res
            .status(500)
            .json({ error: "Error interno del servidor al actualizar el contrato." });
    }
});
// [DELETE] /api/contracts/:id
router.delete("/:id", (req, res) => {
    try {
        const { id } = req.params;
        const contract = database_1.default
            .prepare("SELECT pdf_path FROM contracts WHERE id = ?")
            .get(id);
        if (contract && contract.pdf_path) {
            const filePath = path_1.default.join(__dirname, "../../", contract.pdf_path);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        const info = database_1.default.prepare("DELETE FROM contracts WHERE id = ?").run(id);
        if (info.changes === 0) {
            return res.status(404).json({ error: "Contrato no encontrado." });
        }
        res.status(200).json({ message: "Contrato eliminado con éxito." });
    }
    catch (error) {
        console.error("Error al eliminar contrato:", error);
        res.status(500).json({ error: "Error al eliminar el contrato." });
    }
});
exports.default = router;
