"use strict";
// RUTA: /servidor/src/routes/clients.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = __importDefault(require("../config/database"));
const router = (0, express_1.Router)();
// [GET] /api/clients
router.get("/", (req, res) => {
    try {
        const clients = database_1.default
            .prepare(`
            SELECT c.id, c.name, c.code, c.client_number, (SELECT name FROM contacts WHERE client_id = c.id ORDER BY id LIMIT 1) as contact 
            FROM clients c 
            ORDER BY c.name
        `)
            .all();
        res.status(200).json(clients);
    }
    catch (error) {
        res.status(500).json({ error: "Error al obtener clientes." });
    }
});
// [POST] /api/clients
router.post("/", (req, res) => {
    const { name, code, client_number, address, location, province, cp, email, phone, fiscal_id_type, fiscal_id, contacts = [], } = req.body;
    if (!code || !name)
        return res
            .status(400)
            .json({ error: "El Código de Cliente y la Empresa son requeridos." });
    const clientInsertStmt = database_1.default.prepare("INSERT INTO clients (name, code, client_number, address, location, province, cp, email, phone, fiscal_id_type, fiscal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const contactInsertStmt = database_1.default.prepare("INSERT INTO contacts (client_id, type, name, email, phone) VALUES (?, ?, ?, ?, ?)");
    const createTransaction = database_1.default.transaction((clientData) => {
        const info = clientInsertStmt.run(clientData.name, clientData.code, clientData.client_number, clientData.address, clientData.location, clientData.province, clientData.cp, clientData.email, clientData.phone, clientData.fiscal_id_type, clientData.fiscal_id);
        const clientId = info.lastInsertRowid;
        for (const contact of clientData.contacts) {
            if (contact.type || contact.name || contact.email || contact.phone) {
                contactInsertStmt.run(clientId, contact.type, contact.name, contact.email, contact.phone);
            }
        }
        return { id: clientId };
    });
    try {
        const result = createTransaction({
            name,
            code,
            client_number,
            address,
            location,
            province,
            cp,
            email,
            phone,
            fiscal_id_type,
            fiscal_id,
            contacts,
        });
        res.status(201).json(result);
    }
    catch (error) {
        if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
            return res.status(409).json({ error: "El Código de Cliente ya existe." });
        res.status(500).json({ error: "Error al crear el cliente." });
    }
});
// RUTA DE IMPORTACIÓN CORREGIDA
// [POST] /api/clients/bulk-import
router.post("/bulk-import", (req, res) => {
    const { clients } = req.body;
    if (!Array.isArray(clients)) {
        return res
            .status(400)
            .json({ error: "Se esperaba un arreglo de clientes." });
    }
    const clientInsertStmt = database_1.default.prepare("INSERT OR IGNORE INTO clients (code, name, client_number, fiscal_id_type, fiscal_id, address) VALUES (?, ?, ?, ?, ?, ?)");
    const findClientStmt = database_1.default.prepare("SELECT id FROM clients WHERE code = ?");
    const contactInsertStmt = database_1.default.prepare("INSERT INTO contacts (client_id, type, name, email, phone) VALUES (?, ?, ?, ?, ?)");
    const importTransaction = database_1.default.transaction((clientList) => {
        let importedClientsCount = 0;
        let importedContactsCount = 0;
        let duplicateClientsCount = 0;
        for (const client of clientList) {
            if (client.code && client.name) {
                const info = clientInsertStmt.run(client.code, client.name, client.client_number, client.fiscal_id_type, client.fiscal_id, client.address);
                if (info.changes > 0) {
                    importedClientsCount++;
                    const clientId = info.lastInsertRowid;
                    if (client.contacts && Array.isArray(client.contacts)) {
                        for (const contact of client.contacts) {
                            contactInsertStmt.run(clientId, contact.type, contact.name, contact.email, contact.phone);
                            importedContactsCount++;
                        }
                    }
                }
                else {
                    duplicateClientsCount++;
                    const existingClient = findClientStmt.get(client.code);
                    if (existingClient &&
                        client.contacts &&
                        Array.isArray(client.contacts)) {
                        for (const contact of client.contacts) {
                            contactInsertStmt.run(existingClient.id, contact.type, contact.name, contact.email, contact.phone);
                            importedContactsCount++;
                        }
                    }
                }
            }
        }
        return {
            importedClients: importedClientsCount,
            importedContacts: importedContactsCount,
            duplicates: duplicateClientsCount,
        };
    });
    try {
        const result = importTransaction(clients);
        res.status(201).json(result);
    }
    catch (error) {
        console.error("Error en la importación masiva de clientes:", error);
        res.status(500).json({ error: "Error al importar los clientes." });
    }
});
// [GET] /api/clients/:id
router.get("/:id", (req, res) => {
    try {
        const client = database_1.default
            .prepare("SELECT * FROM clients WHERE id = ?")
            .get(req.params.id);
        if (client) {
            const contacts = database_1.default
                .prepare("SELECT * FROM contacts WHERE client_id = ?")
                .all(req.params.id);
            res.status(200).json(Object.assign(Object.assign({}, client), { contacts }));
        }
        else {
            res.status(404).json({ error: "Cliente no encontrado." });
        }
    }
    catch (error) {
        res.status(500).json({ error: "Error al obtener el cliente." });
    }
});
// [PUT] /api/clients/:id
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { name, code, client_number, address, location, province, cp, email, phone, fiscal_id_type, fiscal_id, contacts = [], } = req.body;
    const updateStmt = database_1.default.prepare("UPDATE clients SET name=?, code=?, client_number=?, address=?, location=?, province=?, cp=?, email=?, phone=?, fiscal_id_type=?, fiscal_id=? WHERE id = ?");
    const deleteContactsStmt = database_1.default.prepare("DELETE FROM contacts WHERE client_id = ?");
    const insertContactStmt = database_1.default.prepare("INSERT INTO contacts (client_id, type, name, email, phone) VALUES (?, ?, ?, ?, ?)");
    const updateTransaction = database_1.default.transaction(() => {
        updateStmt.run(name, code, client_number, address, location, province, cp, email, phone, fiscal_id_type, fiscal_id, id);
        deleteContactsStmt.run(id);
        for (const contact of contacts) {
            if (contact.type || contact.name || contact.email || contact.phone) {
                insertContactStmt.run(id, contact.type, contact.name, contact.email, contact.phone);
            }
        }
    });
    try {
        updateTransaction();
        const updatedClient = database_1.default
            .prepare("SELECT * FROM clients WHERE id = ?")
            .get(id);
        res.status(200).json(updatedClient);
    }
    catch (error) {
        res.status(500).json({ error: "Error al actualizar el cliente." });
    }
});
// [DELETE] /api/clients/:id
router.delete("/:id", (req, res) => {
    try {
        const { id } = req.params;
        const info = database_1.default.prepare("DELETE FROM clients WHERE id = ?").run(id);
        if (info.changes === 0)
            return res.status(404).json({ error: "Cliente no encontrado." });
        res.status(200).json({ message: "Cliente eliminado con éxito." });
    }
    catch (error) {
        res.status(500).json({ error: "Error interno del servidor." });
    }
});
exports.default = router;
