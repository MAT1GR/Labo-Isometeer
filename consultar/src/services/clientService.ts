// RUTA: /cliente/src/services/clientService.ts

import axiosInstance from '../api/axiosInstance';

export interface Client {
  id: number;
  code: string;
  unique_code: string;
  name: string;
  address?: string;
  fiscal_id_type?: string;
  fiscal_id?: string;
}

class ClientService {
  async getAllClients(): Promise<Client[]> {
    try {
      const response = await axiosInstance.get('/clients');
      return response.data;
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw new Error('No se pudieron cargar los clientes.');
    }
  }

  async createClient(clientData: Omit<Client, 'id' | 'unique_code'>): Promise<Client> {
    try {
      const response = await axiosInstance.post('/clients', clientData);
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('Error al crear el cliente.');
    }
  }

  async deleteClient(clientId: number): Promise<void> {
    try {
        await axiosInstance.delete(`/clients/${clientId}`);
    } catch (error: any) {
        if (error.response && error.response.data && error.response.data.error) {
            throw new Error(error.response.data.error);
        }
        throw new Error('Error al eliminar el cliente.');
    }
  }
}

export const clientService = new ClientService();