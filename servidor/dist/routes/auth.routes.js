"use strict";
// RUTA: /servidor/src/routes/auth.routes.ts
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// [POST] /api/auth/login
router.post("/login", (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res
                .status(400)
                .json({ error: "Email y contraseña son requeridos." });
        const userDb = database_1.default
            .prepare("SELECT * FROM users WHERE email = ?")
            .get(email);
        if (!userDb || !bcryptjs_1.default.compareSync(password, userDb.password)) {
            return res.status(401).json({ error: "Credenciales inválidas." });
        }
        // Mensaje en la consola del servidor
        console.log(`El usuario ${userDb.email} ha iniciado sesión.`);
        const { password: _ } = userDb, userToSend = __rest(userDb, ["password"]);
        res.status(200).json(userToSend);
    }
    catch (error) {
        res.status(500).json({ error: "Error interno del servidor." });
    }
});
exports.default = router;
