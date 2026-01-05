
import { ReactNode } from "react";

export interface Activity {
  name: ReactNode;
  precio_sin_iva: number;
  assigned_users: any;
  activity: any;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  id: number;
  ot_id: number;
  description: string;
  materials: string;
  user_id: number;
  user_name?: string;
  hours_spent: number;
  created_at: string;
}

export interface WorkOrder {
  product: ReactNode;
  facturada: any;
  moneda: string;
  client: any;
  date: any;
  certificate_expiry: any;
  estimated_delivery_date: any;
  contact_id: any;
  facturas: boolean;
  id: number;
  client_id: number;
  client_name?: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  custom_id?: string;
  title: string;
  description: string;
  status: "pendiente" | "en_progreso" | "finalizada" | "facturada" | "cerrada";
  priority: "baja" | "media" | "alta";
  assigned_to: number | null;
  assigned_to_name?: string;
  authorized: boolean;
  authorized_by?: number | null;
  authorized_by_name?: string;
  authorization_date?: string | null;
  activities: Activity[];
  completion_date?: string | null;
  created_at: string;
  updated_at: string;
}
