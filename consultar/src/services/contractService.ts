// RUTA: /cliente/src/services/contractService.ts

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

  async updateContract(
    id: number,
    content: string,
    pdfFile: File | null
  ): Promise<void> {
    const formData = new FormData();
    formData.append("content", content);
    if (pdfFile) {
      formData.append("pdf", pdfFile);
    }

    await axiosInstance.put(`/contracts/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }
}

export const contractService = new ContractService();
