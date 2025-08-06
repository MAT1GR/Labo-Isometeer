// RUTA: /servidor/src/routes/clients.routes.ts

import { Router, Request, Response } from "express";
import db from "../config/database";

const router = Router();

// [GET] /api/clients
router.get("/", (req: Request, res: Response) => {
  try {
    const clients = db
      .prepare(
        `
            SELECT c.id, c.name, c.code, (SELECT name FROM contacts WHERE client_id = c.id ORDER BY id LIMIT 1) as contact 
            FROM clients c 
            ORDER BY c.name
        `
      )
      .all();
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener clientes." });
  }
});

// [POST] /api/clients
router.post("/", (req: Request, res: Response) => {
  const {
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
    contacts = [],
  } = req.body;
  if (!code || !name)
    return res
      .status(400)
      .json({ error: "El Código de Cliente y la Empresa son requeridos." });

  const clientInsertStmt = db.prepare(
    "INSERT INTO clients (name, code, client_number, address, location, province, cp, email, phone, fiscal_id_type, fiscal_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const contactInsertStmt = db.prepare(
    "INSERT INTO contacts (client_id, type, name, email, phone) VALUES (?, ?, ?, ?, ?)"
  );

  const createTransaction = db.transaction((clientData) => {
    const info = clientInsertStmt.run(
      clientData.name,
      clientData.code,
      clientData.client_number,
      clientData.address,
      clientData.location,
      clientData.province,
      clientData.cp,
      clientData.email,
      clientData.phone,
      clientData.fiscal_id_type,
      clientData.fiscal_id
    );
    const clientId = info.lastInsertRowid;
    for (const contact of clientData.contacts) {
      if (contact.type || contact.name || contact.email || contact.phone) {
        contactInsertStmt.run(
          clientId,
          contact.type,
          contact.name,
          contact.email,
          contact.phone
        );
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
  } catch (error: any) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
      return res.status(409).json({ error: "El Código de Cliente ya existe." });
    res.status(500).json({ error: "Error al crear el cliente." });
  }
});

// [GET] /api/clients/:id
router.get("/:id", (req: Request, res: Response) => {
  try {
    const client = db
      .prepare("SELECT * FROM clients WHERE id = ?")
      .get(req.params.id);
    if (client) {
      const contacts = db
        .prepare("SELECT * FROM contacts WHERE client_id = ?")
        .all(req.params.id);
      res.status(200).json({ ...client, contacts });
    } else {
      res.status(404).json({ error: "Cliente no encontrado." });
    }
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el cliente." });
  }
});

// [PUT] /api/clients/:id
router.put("/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const {
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
    contacts = [],
  } = req.body;
  const updateStmt = db.prepare(
    "UPDATE clients SET name=?, code=?, client_number=?, address=?, location=?, province=?, cp=?, email=?, phone=?, fiscal_id_type=?, fiscal_id=? WHERE id = ?"
  );
  const deleteContactsStmt = db.prepare(
    "DELETE FROM contacts WHERE client_id = ?"
  );
  const insertContactStmt = db.prepare(
    "INSERT INTO contacts (client_id, type, name, email, phone) VALUES (?, ?, ?, ?, ?)"
  );

  const updateTransaction = db.transaction(() => {
    updateStmt.run(
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
      id
    );
    deleteContactsStmt.run(id);
    for (const contact of contacts) {
      if (contact.type || contact.name || contact.email || contact.phone) {
        insertContactStmt.run(
          id,
          contact.type,
          contact.name,
          contact.email,
          contact.phone
        );
      }
    }
  });

  try {
    updateTransaction();
    const updatedClient = db
      .prepare("SELECT * FROM clients WHERE id = ?")
      .get(id);
    res.status(200).json(updatedClient);
  } catch (error: any) {
    res.status(500).json({ error: "Error al actualizar el cliente." });
  }
});

// [DELETE] /api/clients/:id
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const info = db.prepare("DELETE FROM clients WHERE id = ?").run(id);
    if (info.changes === 0)
      return res.status(404).json({ error: "Cliente no encontrado." });
    res.status(200).json({ message: "Cliente eliminado con éxito." });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

export default router;
