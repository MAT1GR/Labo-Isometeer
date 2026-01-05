// RUTA: /cliente/src/services/clientService.ts

import axiosInstance from "../api/axiosInstance";

export interface Contact {
  id?: number;
  client_id?: number;
  type?: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface Client {
  id: number;
  name: string;
  code: string;
  client_number?: string; // NUEVO CAMPO
  address?: string;
  location?: string;
  province?: string;
  cp?: string;
  email?: string;
  phone?: string;
  fiscal_id_type?: string;
  fiscal_id?: string;
  contacts: Contact[];
}

class ClientService {
  getAll() {
    throw new Error("Method not implemented.");
  }
  async getAllClients(): Promise<Client[]> {
    const response = await axiosInstance.get("/clients");
    return response.data;
  }

  async getClientById(id: number): Promise<Client> {
    const response = await axiosInstance.get(`/clients/${id}`);
    return response.data;
  }

  async createClient(clientData: Partial<Client>): Promise<{ id: number }> {
    const response = await axiosInstance.post("/clients", clientData);
    return response.data;
  }

  async updateClient(id: number, clientData: Partial<Client>): Promise<Client> {
    const response = await axiosInstance.put(`/clients/${id}`, clientData);
    return response.data;
  }

  async deleteClient(clientId: number): Promise<void> {
    await axiosInstance.delete(`/clients/${clientId}`);
  }

  // FUNCIÓN CORREGIDA
  async bulkCreateClients(clients: Partial<Client>[]): Promise<{
    importedClients: number;
    importedContacts: number;
    duplicates: number;
  }> {
    const response = await axiosInstance.post("/clients/bulk-import", {
      clients,
    });
    return response.data;
  }

  // NUEVO MÉTODO AGREGADO
  async getMonthlyUserProduction() {
    const response = await axiosInstance.get(
      "/statistics/user-production-monthly"
    );
    return response.data;
  }
}

export const clientService = new ClientService();
