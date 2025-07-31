// RUTA: /cliente/src/services/pdfGenerator.ts

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { WorkOrder } from "./otService";
import { contractService } from "./contractService";
import { formatDate } from "../lib/utils";
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

export const exportOtToPdf = async (otData: WorkOrder) => {
  // --- Create the final PDF document ---
  const finalPdfDoc = await PDFDocument.create();

  // --- Página 1: Detalles de la OT (generada con jsPDF) ---
  const jspdfDoc = new jsPDF();
  jspdfDoc.setFontSize(18);
  jspdfDoc.text(
    `Orden de Trabajo: ${otData.custom_id || `#${otData.id}`}`,
    14,
    22
  );

  autoTable(jspdfDoc, {
    startY: 30,
    head: [["Campo", "Valor"]],
    body: [
      ["Fecha", formatDate(otData.date)],
      ["Tipo de OT", otData.type],
      ["Cliente", `${otData.client_name} (${otData.client_code})`],
      ["Producto", otData.product],
      ["Marca", otData.brand || "N/A"],
      ["Modelo", otData.model || "N/A"],
      ["Nº de Lacre", otData.seal_number || "N/A"],
      ["Vto. Certificado", formatDate(otData.certificate_expiry || null)],
      ["Estado", otData.status],
      ["Observaciones", otData.observations || "Sin observaciones."],
    ],
    theme: "grid",
  });

  if (otData.activities && otData.activities.length > 0) {
    autoTable(jspdfDoc, {
      startY: (jspdfDoc as any).lastAutoTable.finalY + 10,
      head: [["Actividad", "Estado"]], // Columna "Asignado a" eliminada
      body: otData.activities.map((act) => [act.activity, act.status]),
      theme: "striped",
    });
  }

  // Convert the jsPDF document to bytes and load it into pdf-lib
  const jspdfBytes = jspdfDoc.output("arraybuffer");
  const otPdfDoc = await PDFDocument.load(jspdfBytes);
  const [otPage] = await finalPdfDoc.copyPages(otPdfDoc, [0]);
  finalPdfDoc.addPage(otPage);

  // --- Página 2: Contrato (PDF adjunto) ---
  try {
    const allContracts = await contractService.getAllContracts();
    // Aseguramos que usamos el contract_type del objeto que nos pasan, que viene del formulario
    const selectedContract = allContracts.find(
      (c) => c.name === otData.contract_type
    );

    if (selectedContract) {
      if (selectedContract.pdf_path) {
        // Si hay un PDF, lo obtenemos y lo fusionamos
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
      } else {
        // Si no hay PDF, lo indicamos en el documento
        const textPage = finalPdfDoc.addPage();
        textPage.drawText(`Contrato: ${selectedContract.name}`, {
          x: 50,
          y: textPage.getHeight() - 50,
          size: 18,
        });
        textPage.drawText("No hay un archivo PDF asociado a este contrato.", {
          x: 50,
          y: textPage.getHeight() - 80,
          size: 12,
        });
      }
    } else {
      const textPage = finalPdfDoc.addPage();
      textPage.drawText("No se encontró el contrato seleccionado.", {
        x: 50,
        y: textPage.getHeight() - 50,
        size: 12,
      });
    }
  } catch (error) {
    const textPage = finalPdfDoc.addPage();
    textPage.drawText("Error al cargar el contrato desde el servidor.", {
      x: 50,
      y: textPage.getHeight() - 50,
      size: 12,
    });
  }

  // Guardar y descargar el PDF final
  const finalPdfBytes = await finalPdfDoc.save();
  savePdf(finalPdfBytes, `OT-${otData.custom_id || otData.id}.pdf`);
};
