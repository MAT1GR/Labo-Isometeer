import { Router } from "express";
import sqlite3 from "sqlite3";

const router = Router();

// Función para conectar a la base de datos
const connectDb = () => {
  return new sqlite3.Database('./laboratorio.db');
};
// Obtener todas las facturas con filtros
router.get("/", async (req, res) => {
  const db = await connectDb();
  const { clienteId, fechaDesde, fechaHasta, estado } = req.query;

  let query = `
    SELECT f.id, f.cliente_id, c.nombre as cliente_nombre, f.fecha_emision, f.fecha_vencimiento, f.total, f.estado
    FROM facturas f
    JOIN clientes c ON f.cliente_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (clienteId) {
    query += " AND f.cliente_id = ?";
    params.push(clienteId);
  }
  if (fechaDesde) {
    query += " AND f.fecha_emision >= ?";
    params.push(fechaDesde);
  }
  if (fechaHasta) {
    query += " AND f.fecha_emision <= ?";
    params.push(fechaHasta);
  }
  if (estado) {
    query += " AND f.estado = ?";
    params.push(estado);
  }

  try {
    const facturas = await db.all(query, params);
    res.json(facturas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener las facturas" });
  }
});

// Obtener una factura por ID
router.get("/:id", async (req, res) => {
  const db = await connectDb();
  const { id } = req.params;

  try {
    const factura = await db.get(
      "SELECT f.*, c.nombre as cliente_nombre FROM facturas f JOIN clientes c ON f.cliente_id = c.id WHERE f.id = ?",
      [id]
    );
    if (factura) {
      const detalles = await db.all(
        "SELECT df.*, ot.id as ot_numero FROM detalles_factura df JOIN ots ot ON df.ot_id = ot.id WHERE df.factura_id = ?",
        [id]
      );
      res.json({ ...factura, detalles });
    } else {
      res.status(404).json({ message: "Factura no encontrada" });
    }
  } catch (error) {
    console.error("Error al obtener la factura:", error);
    res.status(500).json({ message: "Error al obtener la factura" });
  }
});

// Crear una nueva factura
router.post("/", async (req, res) => {
  const { cliente_id, fecha_emision, fecha_vencimiento, detalles, total } =
    req.body;

  // --- Validación de Entrada ---
  if (
    !cliente_id ||
    !fecha_emision ||
    !fecha_vencimiento ||
    !detalles ||
    !Array.isArray(detalles) ||
    detalles.length === 0 ||
    total === undefined
  ) {
    return res
      .status(400)
      .json({ message: "Datos de factura incompletos o inválidos." });
  }

  const db = await connectDb();

  try {
    // --- Transacción ---
    await db.exec("BEGIN TRANSACTION");

    const result = await db.run(
      "INSERT INTO facturas (cliente_id, fecha_emision, fecha_vencimiento, total, estado) VALUES (?, ?, ?, ?, ?)",
      [cliente_id, fecha_emision, fecha_vencimiento, total, "pendiente"]
    );
    const facturaId = (result as any).lastID;

    if (!facturaId) {
      // Si lastID no se devuelve, algo salió mal con la inserción.
      throw new Error("No se pudo crear la cabecera de la factura.");
    }

    const stmt = await db.prepare(
      "INSERT INTO detalles_factura (factura_id, ot_id, descripcion, monto) VALUES (?, ?, ?, ?)"
    );
    for (const detalle of detalles) {
      // Validación adicional dentro del bucle
      if (
        detalle.ot_id === undefined ||
        detalle.descripcion === undefined ||
        detalle.monto === undefined
      ) {
        throw new Error("El detalle de la factura es inválido.");
      }
      await stmt.run(
        facturaId,
        detalle.ot_id,
        detalle.descripcion,
        detalle.monto
      );
    }
    await stmt.finalize();

    await db.exec("COMMIT");

    res
      .status(201)
      .json({ id: facturaId, message: "Factura creada con éxito" });
  } catch (error) {
    await db.exec("ROLLBACK");
    console.error("Error al crear la factura:", error);
    // Enviar un mensaje de error más específico si es posible
    const errorMessage =
      error instanceof Error ? error.message : "Error interno del servidor.";
    res
      .status(500)
      .json({ message: "Error al crear la factura.", error: errorMessage });
  }
});

// Actualizar el estado de una factura
router.put("/:id/estado", async (req, res) => {
  const db = await connectDb();
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ message: "El estado es requerido" });
  }

  try {
    await db.run("UPDATE facturas SET estado = ? WHERE id = ?", [estado, id]);
    res.json({ message: "Estado de la factura actualizado" });
  } catch (error) {
    console.error("Error al actualizar estado de la factura:", error);
    res
      .status(500)
      .json({ message: "Error al actualizar el estado de la factura" });
  }
});

export default router;
