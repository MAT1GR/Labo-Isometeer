// RUTA: /cliente/src/lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Activity } from "../services/otService"; // Importar el tipo Activity

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  // Ajustar por la zona horaria para evitar errores de un día
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
};

export const formatDateTime = (
  dateString: string | null | undefined
): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "$0.00";
  return amount.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
  });
};

// --- NUEVA FUNCIÓN MOVILIZADA AQUÍ ---
export const calculateEstimatedDeliveryDate = (
  activities: { activity: string }[] | undefined,
  startDate: string
): string => {
  if (!activities || activities.length === 0 || !startDate) {
    return "";
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

  const validActivities = activities.filter((act) => act && act.activity);
  if (validActivities.length === 0) {
    return "";
  }

  const maxDuration = Math.max(
    ...validActivities.map((act) => activityDurations[act.activity] || 0)
  );

  if (maxDuration === 0) return "";

  const date = new Date(startDate + "T00:00:00");
  date.setDate(date.getDate() + maxDuration);

  return date.toISOString().split("T")[0]; // Devuelve en formato YYYY-MM-DD
};
