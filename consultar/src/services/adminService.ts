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

  async updatePuntajes(puntajes: ActivityPoint[]): Promise<void> {
    await axiosInstance.put("/admin/puntajes", { puntajes });
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
