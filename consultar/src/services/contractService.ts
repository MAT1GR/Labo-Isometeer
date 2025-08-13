// RUTA: /consultar/src/services/contractService.ts

import axiosInstance from "../api/axiosInstance";

export interface Contract {
  id: number;
  name: string;
  content: string;
  pdf_path: string | null;
}

class ContractService {
  async getAllContracts(): Promise<Contract[]> {
    const response = await axiosInstance.get("/contracts");
    return response.data;
  }

  async createContract(name: string, pdfFile: File): Promise<Contract> {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("pdf", pdfFile);

    const response = await axiosInstance.post("/contracts", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  async updateContract(
    id: number,
    name: string,
    pdfFile: File | null
  ): Promise<void> {
    const formData = new FormData();
    formData.append("name", name);
    if (pdfFile) {
      formData.append("pdf", pdfFile);
    }

    await axiosInstance.put(`/contracts/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }

  async deleteContract(id: number): Promise<void> {
    await axiosInstance.delete(`/contracts/${id}`);
  }
}

export const contractService = new ContractService();
