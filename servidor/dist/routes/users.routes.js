"use strict";
// RUTA: /servidor/src/routes/users.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// [GET] /api/users
router.get("/", (req, res) => {
    try {
        const users = database_1.default
            .prepare("SELECT id, email, name, role, points FROM users ORDER BY name")
            .all();
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ error: "Error interno del servidor." });
    }
});
// [POST] /api/users
router.post("/", (req, res) => {
    try {
        const { email, password, name, role } = req.body;
        if (!email || !password || !name || !role)
            return res
                .status(400)
                .json({ error: "Todos los campos son requeridos." });
        const hashedPassword = bcryptjs_1.default.hashSync(password, 10);
        const info = database_1.default
            .prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)")
            .run(email, hashedPassword, name, role);
        const newUser = database_1.default
            .prepare("SELECT id, email, name, role, points FROM users WHERE id = ?")
            .get(info.lastInsertRowid);
        res.status(201).json(newUser);
    }
    catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
            return res.status(409).json({ error: "El email ya está en uso." });
        res.status(500).json({ error: "Error interno del servidor." });
    }
});
// [POST] /api/users/bulk-import
router.post("/bulk-import", (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) {
        return res
            .status(400)
            .json({ error: "Se esperaba un arreglo de usuarios." });
    }
    const insertStmt = database_1.default.prepare("INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
    const importTransaction = database_1.default.transaction((userList) => {
        let importedCount = 0;
        for (const user of userList) {
            if (user.name && user.email && user.password && user.role) {
                const hashedPassword = bcryptjs_1.default.hashSync(user.password.toString(), 10);
                const info = insertStmt.run(user.name, user.email, hashedPassword, user.role);
                if (info.changes > 0) {
                    importedCount++;
                }
            }
        }
        return { imported: importedCount, total: userList.length };
    });
    try {
        const result = importTransaction(users);
        res.status(201).json({
            imported: result.imported,
            duplicates: result.total - result.imported,
        });
    }
    catch (error) {
        console.error("Error en la importación masiva de usuarios:", error);
        res.status(500).json({ error: "Error al importar los usuarios." });
    }
});
// [DELETE] /api/users/:id
router.delete("/:id", (req, res) => {
    const { id } = req.params;
    if (id === "1") {
        return res
            .status(403)
            .json({ error: "No se puede eliminar al administrador principal." });
    }
    const deleteUserTransaction = database_1.default.transaction(() => {
        // Reasigna las OTs creadas por este usuario al administrador principal (ID 1)
        // para evitar errores de clave foránea sin perder datos.
        database_1.default.prepare("UPDATE work_orders SET created_by = 1 WHERE created_by = ?").run(id);
        // Ahora, elimina el usuario. La configuración ON DELETE CASCADE en
        // la tabla de asignaciones se encargará de las tareas asignadas.
        const info = database_1.default.prepare("DELETE FROM users WHERE id = ?").run(id);
        return info;
    });
    try {
        const info = deleteUserTransaction();
        if (info.changes === 0) {
            return res.status(404).json({ error: "Usuario no encontrado." });
        }
        res.status(200).json({ message: "Usuario eliminado con éxito." });
    }
    catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});
// [PUT] /api/users/:id/password
router.put("/:id/password", (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return res
                .status(400)
                .json({ error: "Todos los campos son requeridos." });
        const user = database_1.default
            .prepare("SELECT password FROM users WHERE id = ?")
            .get(id);
        if (!user)
            return res.status(404).json({ error: "Usuario no encontrado." });
        const isMatch = bcryptjs_1.default.compareSync(currentPassword, user.password);
        if (!isMatch)
            return res
                .status(400)
                .json({ error: "La contraseña actual es incorrecta." });
        const hashedNewPassword = bcryptjs_1.default.hashSync(newPassword, 10);
        database_1.default.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedNewPassword, id);
        res.status(200).json({ message: "Contraseña actualizada con éxito." });
    }
    catch (error) {
        res.status(500).json({ error: "Error interno del servidor." });
    }
});
exports.default = router;
