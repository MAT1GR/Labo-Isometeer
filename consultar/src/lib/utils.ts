// RUTA: consultar/src/lib/utils.ts (Corregido)

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "ARS") {
  const formatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Ajusta el formato de USD para mayor claridad
  if (currency === "USD") {
    return formatter.format(amount).replace("US$", "USD ");
  }

  return formatter.format(amount);
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(dateString: string) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Fecha inválida";
    }
    return new Intl.DateTimeFormat("es-AR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", dateString, error);
    return "Fecha inválida";
  }
}

/**
 * Calcula una fecha futura sumando un número de días a la fecha actual.
 * Devuelve la fecha en formato YYYY-MM-DD.
 */
export function calculateEstimatedDeliveryDate(days: number): string {
  if (typeof days !== "number" || days < 0) {
    // Devuelve la fecha de hoy si los días no son válidos
    return new Date().toISOString().split("T")[0];
  }
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}
