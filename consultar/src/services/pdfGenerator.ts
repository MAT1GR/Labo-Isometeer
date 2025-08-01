// RUTA: /cliente/src/services/pdfGenerator.ts

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { WorkOrder, Activity } from "./otService";
import { contractService } from "./contractService";
import { formatDate, formatCurrency } from "../lib/utils";
import { PDFDocument } from "pdf-lib";
import axiosInstance from "../api/axiosInstance";

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

// --- VERSIÓN PARA EL CLIENTE ---
export const exportOtToPdfClient = async (otData: WorkOrder) => {
  const finalPdfDoc = await PDFDocument.create();
  const jspdfDoc = new jsPDF();

  jspdfDoc.setFontSize(18);
  jspdfDoc.text(
    `Orden de Trabajo: ${otData.custom_id || `#${otData.id}`}`,
    14,
    22
  );
  jspdfDoc.setFontSize(12);
  jspdfDoc.text(`Fecha de Emisión: ${formatDate(otData.date)}`, 14, 30);

  // --- SECCIÓN DATOS DEL CLIENTE ---
  autoTable(jspdfDoc, {
    startY: 40,
    head: [["Datos del Cliente"]],
    body: [
      ["Empresa", otData.client?.name || "N/A"],
      ["Nº Cliente", otData.client?.code || "N/A"],
      ["Dirección", otData.client?.address || "N/A"],
      [
        "ID Fiscal",
        `${otData.client?.fiscal_id_type || ""} ${
          otData.client?.fiscal_id || ""
        }`.trim() || "N/A",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: [22, 163, 74] },
  });

  // --- SECCIÓN CONTACTOS DEL CLIENTE ---
  if (otData.client?.contacts && otData.client.contacts.length > 0) {
    autoTable(jspdfDoc, {
      head: [["Tipo", "Nombre", "Email", "Teléfono"]],
      body: otData.client.contacts.map((c) => [
        c.type || "N/A",
        c.name,
        c.email || "N/A",
        c.phone || "N/A",
      ]),
      theme: "striped",
      startY: (jspdfDoc as any).lastAutoTable.finalY + 2,
    });
  }

  // --- SECCIÓN DATOS DEL PRODUCTO ---
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 10,
    head: [["Datos del Producto y Servicio"]],
    body: [
      ["Tipo de OT", otData.type],
      ["Producto", otData.product],
      ["Marca", otData.brand || "N/A"],
      ["Modelo", otData.model || "N/A"],
      ["Nº de Lacre", otData.seal_number || "N/A"],
      ["Vto. Certificado", formatDate(otData.certificate_expiry ?? null)],
      ["Observaciones", otData.observations || "Sin observaciones."],
    ],
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235] },
  });

  // --- SECCIÓN DE FECHA DE ENTREGA ---
  const estimatedDate = calculateEstimatedDeliveryDate(
    otData.activities,
    otData.date
  );
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 10,
    head: [["Plazo de Entrega"]],
    body: [["Fecha Estimada de Entrega", estimatedDate]],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
  });

  // --- SECCIÓN DE ACTIVIDADES (SIN ASIGNACIÓN) ---
  if (otData.activities && otData.activities.length > 0) {
    autoTable(jspdfDoc, {
      startY: (jspdfDoc as any).lastAutoTable.finalY + 10,
      head: [["Actividades a Realizar"]],
      body: otData.activities.map((act) => [act.activity]),
      theme: "striped",
      headStyles: { fillColor: [107, 114, 128] },
    });
  }

  const jspdfBytes = jspdfDoc.output("arraybuffer");
  const otPdfDoc = await PDFDocument.load(jspdfBytes);
  const [otPage] = await finalPdfDoc.copyPages(otPdfDoc, [0]);
  finalPdfDoc.addPage(otPage);

  await appendContractToPdf(finalPdfDoc, otData.contract_type);

  const finalPdfBytes = await finalPdfDoc.save();
  savePdf(finalPdfBytes, `OT-Cliente-${otData.custom_id || otData.id}.pdf`);
};

// --- VERSIÓN INTERNA ---
export const exportOtToPdfInternal = async (otData: WorkOrder) => {
  const finalPdfDoc = await PDFDocument.create();
  const jspdfDoc = new jsPDF();

  jspdfDoc.setFontSize(18);
  jspdfDoc.text(`OT Interna: ${otData.custom_id || `#${otData.id}`}`, 14, 22);
  jspdfDoc.setFontSize(12);
  jspdfDoc.text(`Fecha de Emisión: ${formatDate(otData.date)}`, 14, 30);

  // --- DATOS DEL CLIENTE ---
  autoTable(jspdfDoc, {
    startY: 40,
    head: [["Datos del Cliente"]],
    body: [
      ["Empresa", otData.client?.name || "N/A"],
      ["Nº Cliente", otData.client?.code || "N/A"],
    ],
    theme: "grid",
    headStyles: { fillColor: [22, 163, 74] },
  });

  // --- DATOS DEL PRODUCTO ---
  autoTable(jspdfDoc, {
    startY: (jspdfDoc as any).lastAutoTable.finalY + 10,
    head: [["Datos del Producto y Servicio"]],
    body: [
      ["Tipo de OT", otData.type],
      ["Producto", otData.product],
      ["Marca", otData.brand || "N/A"],
      ["Modelo", otData.model || "N/A"],
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
    startY: (jspdfDoc as any).lastAutoTable.finalY + 10,
    head: [["Estadísticas y Cotización"]],
    body: [
      ["Cotización", otData.quotation_details || "N/A"],
      ["Monto", formatCurrency(otData.quotation_amount || 0)],
      ["Fecha Estimada de Entrega", estimatedDate],
      ["Estado Actual", otData.status],
    ],
    theme: "grid",
    headStyles: { fillColor: [79, 70, 229] },
  });

  // --- ACTIVIDADES CON ASIGNACIÓN ---
  if (otData.activities && otData.activities.length > 0) {
    autoTable(jspdfDoc, {
      startY: (jspdfDoc as any).lastAutoTable.finalY + 10,
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

  const jspdfBytes = jspdfDoc.output("arraybuffer");
  const otPdfDoc = await PDFDocument.load(jspdfBytes);
  const [otPage] = await finalPdfDoc.copyPages(otPdfDoc, [0]);
  finalPdfDoc.addPage(otPage);

  await appendContractToPdf(finalPdfDoc, otData.contract_type);

  const finalPdfBytes = await finalPdfDoc.save();
  savePdf(finalPdfBytes, `OT-Interna-${otData.custom_id || otData.id}.pdf`);
};
