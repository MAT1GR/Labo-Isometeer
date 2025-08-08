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
  doc.addImage(logo, "PNG", 14, 8, 32, 24); // x, y, width, height (ajustado por el usuario)

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

  const selectedContact = otData.client?.contacts.find(
    (c) => c.id === otData.contact_id
  );

  // --- SECCIÓN DATOS DEL CLIENTE ---
  autoTable(jspdfDoc, {
    startY: 45,
    head: [["Datos del Cliente", ""]],
    body: [
      ["Empresa", otData.client?.name || "N/A"],
      ["Referente", selectedContact ? selectedContact.name : "N/A"],
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

  // --- SECCIÓN DATOS DEL PRODUCTO ---
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
    head: [["Datos del Producto", ""]],
    body: [
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

  // --- SECCIÓN DE DETALLES DEL SERVICIO (SEPARADA) ---
  const estimatedDate = formatDate(otData.estimated_delivery_date);
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
    head: [["Detalles del Servicio", ""]],
    body: [
      ["Tipo de OT", otData.type],
      ["Fecha Estimada de Entrega", estimatedDate],
    ],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  // --- SECCIÓN DE ACTIVIDADES (SEPARADA) ---
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

  // --- SECCIÓN DE OBSERVACIONES ---
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

  const selectedContact = otData.client?.contacts.find(
    (c) => c.id === otData.contact_id
  );

  // --- SECCIÓN DATOS DEL CLIENTE ---
  autoTable(jspdfDoc, {
    startY: 45,
    head: [["Datos del Cliente", ""]],
    body: [
      ["Empresa", otData.client?.name || "N/A"],
      ["Referente", selectedContact ? selectedContact.name : "N/A"],
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

  // --- SECCIÓN DATOS DEL PRODUCTO ---
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
    head: [["Datos del Producto", ""]],
    body: [
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

  // --- SECCIÓN DE DETALLES DEL SERVICIO (SEPARADA) ---
  const estimatedDate = formatDate(otData.estimated_delivery_date);
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 5,
    head: [["Detalles del Servicio", ""]],
    body: [
      ["Tipo de OT", otData.type],
      ["Fecha Estimada de Entrega", estimatedDate],
    ],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: { 0: { fontStyle: "bold" } },
  });

  // --- SECCIÓN DE ACTIVIDADES (SEPARADA) ---
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
  const estimatedDate = formatDate(otData.estimated_delivery_date);
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

// --- PDF: ETIQUETA ---

export const exportOtPdfEtiqueta = async (otData: WorkOrder) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const labelWidth = 50;
  const labelHeight = 74.25;

  const drawLabelContent = (startX: number, startY: number) => {
    const margin = 1;
    const innerX = startX + margin;
    const innerWidth = labelWidth - margin * 2;
    const centerX = startX + labelWidth / 2;
    let currentY = startY + 15;

    // Borde de cada etiqueta individual más grueso
    doc.setLineWidth(0.7);
    doc.setDrawColor(0);
    doc.rect(startX, 6, labelWidth, 60);

    // Separar el ID del código de cliente
    const fullId = otData.custom_id || "";
    const lastSpaceIndex = fullId.lastIndexOf(" ");
    const mainId =
      lastSpaceIndex !== -1 ? fullId.substring(0, lastSpaceIndex) : fullId;
    const clientCode =
      lastSpaceIndex !== -1 ? fullId.substring(lastSpaceIndex + 1) : "";

    // 1. ID Principal y Código de Cliente (ambos en negrita)
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(mainId, centerX, currentY, { align: "center" });
    currentY += 8;
    doc.text(clientCode, centerX, currentY, { align: "center" });
    currentY += 10;

    // 2. Producto (en lugar de la línea)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(otData.product || "N/A", centerX, currentY, { align: "center" });
    currentY += 8;

    // 3. Detalles
    const detailStartX = innerX + 4;
    doc.setFontSize(11);

    // Marca
    doc.setFont("helvetica", "normal");
    doc.text("Marca:", detailStartX, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(otData.brand || "N/A", detailStartX + 14, currentY);
    currentY += 7;

    // Modelo
    doc.setFont("helvetica", "normal");
    doc.text("Modelo:", detailStartX, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(otData.model || "N/A", detailStartX + 15, currentY);
    currentY += 7;

    // Actividad
    const activities =
      otData.activities?.map((a) => a.activity).join(", ") || "N/A";
    doc.setFont("helvetica", "normal");
    doc.text("Actividad:", detailStartX, currentY);
    doc.setFont("helvetica", "bold");
    const activityLines = doc.splitTextToSize(activities, innerWidth - 22);
    doc.text(activityLines, detailStartX + 18, currentY);
  };

  // Dibujar la primera etiqueta en la esquina superior izquierda
  drawLabelContent(52.5, 0);
  // Dibujar la segunda etiqueta al lado de la primera
  drawLabelContent(107.5, 0);

  const pdfBytes = doc.output("arraybuffer");
  const finalPdfDoc = await PDFDocument.load(pdfBytes);
  const finalPdfBytes = await finalPdfDoc.save();
  savePdf(finalPdfBytes, `Etiqueta-${otData.custom_id || otData.id}.pdf`);
};
