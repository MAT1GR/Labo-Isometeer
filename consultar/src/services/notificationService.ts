// RUTA: /consultar/src/services/notificationService.ts

import axiosInstance from "../api/axiosInstance";

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  ot_id: number | null;
  is_read: boolean;
  created_at: string;
}

class NotificationService {
  async getNotifications(userId: number): Promise<Notification[]> {
    const response = await axiosInstance.get(`/notifications/${userId}`);
    return response.data;
  }

  async markAsRead(ids: number[], userId: number): Promise<void> {
    await axiosInstance.put("/notifications/mark-as-read", { ids, userId });
  }
}

export const notificationService = new NotificationService();
