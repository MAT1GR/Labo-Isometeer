// RUTA: consultar/src/lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Activity } from "../services/otService";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const calculateEstimatedDeliveryDate = (
  activities: Partial<Activity>[],
  startDate: string
): string => {
  if (!startDate || !activities || activities.length === 0) {
    return "";
  }
  const businessDaysPerActivity = 5;
  let totalBusinessDaysToAdd = activities.length * businessDaysPerActivity;
  let currentDate = new Date(startDate);
  while (totalBusinessDaysToAdd > 0) {
    currentDate.setDate(currentDate.getDate() + 1);
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      totalBusinessDaysToAdd--;
    }
  }
  return currentDate.toISOString().split("T")[0];
};

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = "ARS"
): string {
  if (amount === null || amount === undefined) {
    return "$ 0,00";
  }
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency,
  }).format(amount);
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) {
    return "N/A";
  }
  try {
    return new Date(dateString).toLocaleString("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "Fecha inválida";
  }
}

/**
 * NUEVA FUNCIÓN: Formatea una fecha en formato localizado (solo fecha).
 * @param dateString - La fecha en formato ISO (ej: "2023-10-27T10:00:00Z").
 * @returns La fecha formateada (ej: "27/10/2023").
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return "N/A";
  }
  try {
    // Agregamos el ajuste de zona horaria para evitar que la fecha cambie
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString(
      "es-AR",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );
  } catch (error) {
    return "Fecha inválida";
  }
}
