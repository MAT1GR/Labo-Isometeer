// RUTA: /cliente/src/services/pdfGenerator.ts

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { WorkOrder, Activity } from "./otService";
import { contractService } from "./contractService";
import { formatDate, formatCurrency } from "../lib/utils";
import { PDFDocument } from "pdf-lib";
import axiosInstance from "../api/axiosInstance";
import logo from "/logo.png";

// Helper para construir la URL base para archivos estáticos
const staticBaseUrl = axiosInstance.defaults.baseURL?.replace("/api", "") || "";

// Helper function to save the generated PDF
const savePdf = (uint8Array: Uint8Array, filename: string) => {
  const blob = new Blob([uint8Array], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- FUNCIÓN PARA CALCULAR FECHA DE ENTREGA ---
const calculateEstimatedDeliveryDate = (
  activities: Activity[] | undefined,
  startDate: string
): string => {
  if (!activities || activities.length === 0 || !startDate) {
    return "N/A";
  }

  const activityDurations: { [key: string]: number } = {
    Calibracion: 7,
    Completo: 45,
    Ampliado: 30,
    Refurbished: 7,
    Fabricacion: 45,
    "Verificacion de identidad": 21,
    Reducido: 21,
    "Servicio tecnico": 7,
    Capacitacion: 10,
    Emision: 1,
  };

  const maxDuration = Math.max(
    ...activities.map((act) => activityDurations[act.activity] || 0)
  );

  if (maxDuration === 0) return "N/A";

  // Se asegura de que la fecha se interprete correctamente sin problemas de zona horaria
  const date = new Date(startDate + "T00:00:00");
  date.setDate(date.getDate() + maxDuration);

  return formatDate(date.toISOString());
};

// --- FUNCIÓN BASE PARA ADJUNTAR CONTRATO ---
const appendContractToPdf = async (
  finalPdfDoc: PDFDocument,
  contractType: string | undefined
) => {
  if (!contractType) return;
  try {
    const allContracts = await contractService.getAllContracts();
    const selectedContract = allContracts.find((c) => c.name === contractType);
    if (selectedContract && selectedContract.pdf_path) {
      const pdfUrl = `${staticBaseUrl}/${selectedContract.pdf_path}`;
      const contractPdfBytes = await fetch(pdfUrl).then((res) =>
        res.arrayBuffer()
      );
      const contractPdfDoc = await PDFDocument.load(contractPdfBytes);
      const copiedPages = await finalPdfDoc.copyPages(
        contractPdfDoc,
        contractPdfDoc.getPageIndices()
      );
      copiedPages.forEach((page) => finalPdfDoc.addPage(page));
    }
  } catch (error) {
    console.error("Error al cargar el contrato PDF:", error);
    // Opcional: añadir una página de error al PDF
    const errorPage = finalPdfDoc.addPage();
    errorPage.drawText("No se pudo cargar el archivo PDF del contrato.", {
      x: 50,
      y: errorPage.getHeight() - 50,
      size: 12,
    });
  }
};

const addHeader = (doc: jsPDF, title: string, otData: WorkOrder) => {
  // Añadir el logo
  doc.addImage(logo, "PNG", 14, 10, 30, 15); // x, y, width, height (ajustado para mejor proporción)

  doc.setFontSize(18);
  doc.text("Laboratorio Consultar", 105, 15, { align: "center" });
  doc.setFontSize(16);
  doc.text(title, 105, 22, { align: "center" });
  doc.setFontSize(12);
  doc.text(`Fecha de Emisión: ${formatDate(otData.date)}`, 105, 30, {
    align: "center",
  });
};

const addFooterLegend = (doc: jsPDF, isRemito: boolean = false) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const legendText = isRemito
    ? "Los productos a ensayar/calibrar son desarrollos propietarios ajenos. Nuestra actividad técnica, es reservada y confidencial. Respetar en todo momento esa condición."
    : "Las muestras estarán disponibles para su retiro durante los 2 MESES posteriores a la fecha de emision del reporte. Luego pasará a disposicion de rezago y YA NO PODRÁ ser reclamada.";

  const textLines = doc.splitTextToSize(legendText, 180); // Ancho del texto
  const textHeight = textLines.length * 5;
  const rectY = pageHeight - 28;

  doc.setFillColor(0, 0, 0); // Color de fondo negro
  doc.rect(10, rectY, 190, textHeight + 6, "F"); // Dibuja el rectángulo relleno

  doc.setFontSize(10); // Tamaño de fuente un poco más grande
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255); // Color de texto blanco
  doc.text(textLines, 105, rectY + 6, { align: "center" });

  // Restaurar colores por defecto
  doc.setTextColor(0, 0, 0);
};

// --- PDF: ORDEN DE TRABAJO (CLIENTE) ---
export const exportOtPdfWorkOrder = async (otData: WorkOrder) => {
  const finalPdfDoc = await PDFDocument.create();
  const jspdfDoc = new jsPDF();

  addHeader(
    jspdfDoc,
    `Orden de Trabajo: ${otData.custom_id || `#${otData.id}`}`,
    otData
  );

  // --- SECCIÓN DATOS DEL CLIENTE ---
  autoTable(jspdfDoc, {
    startY: 45,
    head: [["Datos del Cliente", ""]],
    body: [
      ["Empresa", otData.client?.name || "N/A"],
      [
        "Dirección",
        `${otData.client?.address || ""}, ${otData.client?.location || ""}, ${
          otData.client?.province || ""
        } (CP: ${otData.client?.cp || "N/A"})`,
      ],
      ["Email", otData.client?.email || "N/A"],
      ["Celular", otData.client?.phone || "N/A"],
      [
        "ID Fiscal",
        `${otData.client?.fiscal_id_type || ""} ${
          otData.client?.fiscal_id || ""
        }`.trim() || "N/A",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [22, 163, 74] },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  // --- SECCIÓN CONTACTOS DEL CLIENTE ---
  if (otData.client?.contacts && otData.client.contacts.length > 0) {
    autoTable(jspdfDoc, {
      head: [["Referente", "Nombre", "Email", "Teléfono"]],
      body: otData.client.contacts.map((c) => [
        c.type || "N/A",
        c.name,
        c.email || "N/A",
        c.phone || "N/A",
      ]),
      theme: "striped",
      startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
      headStyles: { fillColor: [107, 114, 128] },
    });
  }

  // --- SECCIÓN DATOS DEL PRODUCTO ---
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
    head: [["Datos del Producto", ""]],
    body: [
      ["Tipo de OT", otData.type],
      ["Producto", otData.product],
      ["Marca", otData.brand || "N/A"],
      ["Modelo", otData.model || "N/A"],
      ["Nº de Lacre/Toma de muestra", otData.seal_number || "N/A"],
      ["Vto. Certificado", formatDate(otData.certificate_expiry ?? null)],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  // --- SECCIÓN DE FECHA DE ENTREGA (MOVIDA) ---
  const estimatedDate = calculateEstimatedDeliveryDate(
    otData.activities,
    otData.date
  );
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 2,
    head: [["Fecha Estimada de Entrega"]],
    body: [[estimatedDate]],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
  });

  // --- SECCIÓN DE ACTIVIDADES CON PRECIO Y NORMA ---
  if (otData.activities && otData.activities.length > 0) {
    autoTable(jspdfDoc, {
      startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
      head: [["Actividad", "Norma de Referencia", "Precio (Sin IVA)"]],
      body: otData.activities.map((act) => [
        act.activity,
        act.norma || "N/A",
        formatCurrency(act.precio_sin_iva || 0),
      ]),
      theme: "striped",
      headStyles: { fillColor: [107, 114, 128] },
    });
  }

  // --- SECCIÓN DE OBSERVACIONES (MOVIDA) ---
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 2,
    head: [["Observaciones"]],
    body: [[otData.observations || "Sin observaciones."]],
    theme: "grid",
  });

  addFooterLegend(jspdfDoc);

  const jspdfBytes = jspdfDoc.output("arraybuffer");
  const otPdfDoc = await PDFDocument.load(jspdfBytes);
  const copiedPages = await finalPdfDoc.copyPages(
    otPdfDoc,
    otPdfDoc.getPageIndices()
  );
  copiedPages.forEach((page) => finalPdfDoc.addPage(page));

  await appendContractToPdf(finalPdfDoc, otData.contract_type);

  const finalPdfBytes = await finalPdfDoc.save();
  savePdf(finalPdfBytes, `OT-${otData.custom_id || otData.id}.pdf`);
};

// --- PDF: REMITO / RECIBO (CLIENTE, SIN PRECIO) ---
export const exportOtPdfRemito = async (otData: WorkOrder) => {
  const finalPdfDoc = await PDFDocument.create();
  const jspdfDoc = new jsPDF();

  addHeader(
    jspdfDoc,
    `Remito / Recibo: ${otData.custom_id || `#${otData.id}`}`,
    otData
  );

  // --- SECCIÓN DATOS DEL CLIENTE ---
  autoTable(jspdfDoc, {
    startY: 45,
    head: [["Datos del Cliente", ""]],
    body: [
      ["Empresa", otData.client?.name || "N/A"],
      [
        "Dirección",
        `${otData.client?.address || ""}, ${otData.client?.location || ""}, ${
          otData.client?.province || ""
        } (CP: ${otData.client?.cp || "N/A"})`,
      ],
      ["Email", otData.client?.email || "N/A"],
      ["Celular", otData.client?.phone || "N/A"],
      [
        "ID Fiscal",
        `${otData.client?.fiscal_id_type || ""} ${
          otData.client?.fiscal_id || ""
        }`.trim() || "N/A",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [22, 163, 74] },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  // --- SECCIÓN CONTACTOS DEL CLIENTE ---
  if (otData.client?.contacts && otData.client.contacts.length > 0) {
    autoTable(jspdfDoc, {
      head: [["Referente", "Nombre", "Email", "Teléfono"]],
      body: otData.client.contacts.map((c) => [
        c.type || "N/A",
        c.name,
        c.email || "N/A",
        c.phone || "N/A",
      ]),
      theme: "striped",
      startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
      headStyles: { fillColor: [107, 114, 128] },
    });
  }

  // --- SECCIÓN DATOS DEL PRODUCTO ---
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
    head: [["Datos del Producto", ""]],
    body: [
      ["Tipo de OT", otData.type],
      ["Producto", otData.product],
      ["Marca", otData.brand || "N/A"],
      ["Modelo", otData.model || "N/A"],
      ["Nº de Lacre/Toma de muestra", otData.seal_number || "N/A"],
      ["Vto. Certificado", formatDate(otData.certificate_expiry ?? null)],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  // --- SECCIÓN DE FECHA DE ENTREGA (MOVIDA) ---
  const estimatedDate = calculateEstimatedDeliveryDate(
    otData.activities,
    otData.date
  );
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 2,
    head: [["Fecha Estimada de Entrega"]],
    body: [[estimatedDate]],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
  });

  // --- SECCIÓN DE ACTIVIDADES (SIN ASIGNACIÓN) ---
  if (otData.activities && otData.activities.length > 0) {
    autoTable(jspdfDoc, {
      startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
      head: [["Actividades a Realizar", "Norma"]],
      body: otData.activities.map((act) => [act.activity, act.norma || "N/A"]),
      theme: "striped",
      headStyles: { fillColor: [107, 114, 128] },
    });
  }

  // --- SECCIÓN DE OBSERVACIONES (MOVIDA) ---
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 2,
    head: [["Observaciones"]],
    body: [[otData.observations || "Sin observaciones."]],
    theme: "grid",
  });

  addFooterLegend(jspdfDoc, true); // true para indicar que es un remito

  const jspdfBytes = jspdfDoc.output("arraybuffer");
  const otPdfDoc = await PDFDocument.load(jspdfBytes);
  const copiedPages = await finalPdfDoc.copyPages(
    otPdfDoc,
    otPdfDoc.getPageIndices()
  );
  copiedPages.forEach((page) => finalPdfDoc.addPage(page));

  await appendContractToPdf(finalPdfDoc, otData.contract_type);

  const finalPdfBytes = await finalPdfDoc.save();
  savePdf(finalPdfBytes, `Remito-${otData.custom_id || otData.id}.pdf`);
};

// --- VERSIÓN INTERNA ---
export const exportOtToPdfInternal = async (otData: WorkOrder) => {
  const finalPdfDoc = await PDFDocument.create();
  const jspdfDoc = new jsPDF();

  addHeader(
    jspdfDoc,
    `OT Interna: ${otData.custom_id || `#${otData.id}`}`,
    otData
  );

  // --- DATOS DEL CLIENTE ---
  autoTable(jspdfDoc, {
    startY: 45,
    head: [["Campo", "Información"]],
    body: [
      ["Empresa", otData.client?.name || "N/A"],
      ["Nº Cliente", otData.client?.code || "N/A"],
    ],
    theme: "grid",
    headStyles: { fillColor: [22, 163, 74] },
  });

  // --- DATOS DEL PRODUCTO ---
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
    head: [["Campo", "Información"]],
    body: [
      ["Tipo de OT", otData.type],
      ["Producto", otData.product],
      ["Marca", otData.brand || "N/A"],
      ["Modelo", otData.model || "N/A"],
      ["Nº de Lacre/Toma de muestra", otData.seal_number || "N/A"],
      ["Vto. Certificado", formatDate(otData.certificate_expiry ?? null)],
      ["Observaciones (Cliente)", otData.observations || "N/A"],
      [
        "Observaciones (Colaborador)",
        otData.collaborator_observations || "N/A",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
  });

  // --- ESTADÍSTICAS Y COTIZACIÓN ---
  const estimatedDate = calculateEstimatedDeliveryDate(
    otData.activities,
    otData.date
  );
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
    head: [["Campo", "Información"]],
    body: [
      ["Cotización", otData.quotation_details || "N/A"],
      ["Monto", formatCurrency(otData.quotation_amount || 0)],
      ["Fecha Estimada de Entrega", estimatedDate],
      ["Estado Actual", otData.status],
      ["Autorizado", otData.authorized ? "Sí" : "No"],
      ["Disposición", otData.disposition || "N/A"],
    ],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
  });

  // --- ACTIVIDADES CON ASIGNACIÓN ---
  if (otData.activities && otData.activities.length > 0) {
    autoTable(jspdfDoc, {
      startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
      head: [["Actividad", "Asignado a", "Estado"]],
      body: otData.activities.map((act) => [
        act.activity,
        act.assigned_users?.map((u) => u.name).join(", ") || "Sin asignar",
        act.status,
      ]),
      theme: "striped",
      headStyles: { fillColor: [107, 114, 128] },
    });
  }

  addFooterLegend(jspdfDoc);

  const jspdfBytes = jspdfDoc.output("arraybuffer");
  const otPdfDoc = await PDFDocument.load(jspdfBytes);
  const copiedPages = await finalPdfDoc.copyPages(
    otPdfDoc,
    otPdfDoc.getPageIndices()
  );
  copiedPages.forEach((page) => finalPdfDoc.addPage(page));

  await appendContractToPdf(finalPdfDoc, otData.contract_type);

  const finalPdfBytes = await finalPdfDoc.save();
  savePdf(finalPdfBytes, `OT-Interna-${otData.custom_id || otData.id}.pdf`);
};
