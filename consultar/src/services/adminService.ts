// RUTA: /cliente/src/services/adminService.ts

import axiosInstance from "../api/axiosInstance";

export interface ActivityPoint {
  id: number;
  activity: string;
  points: number;
}

class AdminService {
  async getPuntajes(): Promise<ActivityPoint[]> {
    const response = await axiosInstance.get("/admin/puntajes");
    return response.data;
  }

  async createActivity(activityData: {
    activity: string;
    points: number;
  }): Promise<ActivityPoint> {
    const response = await axiosInstance.post("/admin/puntajes", activityData);
    return response.data;
  }

  async updateActivity(
    id: number,
    activityData: { activity: string; points: number }
  ): Promise<ActivityPoint> {
    const response = await axiosInstance.put(
      `/admin/puntajes/${id}`,
      activityData
    );
    return response.data;
  }

  async deleteActivity(id: number): Promise<void> {
    await axiosInstance.delete(`/admin/puntajes/${id}`);
  }

  async uploadFavicon(file: File): Promise<void> {
    const formData = new FormData();
    formData.append("favicon", file);

    await axiosInstance.post("/admin/favicon", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }
}

export const adminService = new AdminService();
