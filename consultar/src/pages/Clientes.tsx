// RUTA: /cliente/src/pages/Clientes.tsx

import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientService, Client } from "../services/clientService";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { PlusCircle, Users, Trash2, Upload, Edit } from "lucide-react";
import useSWR, { mutate } from "swr";
import { fetcher } from "../api/axiosInstance";
import * as XLSX from "xlsx";
import ConfirmationModal from "../components/ui/ConfirmationModal"; // Importamos el modal

const Clientes: React.FC = () => {
  const {
    data: clients,
    error,
    isLoading,
  } = useSWR<Client[]>("/clients", fetcher);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para el modal de confirmación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);

  const handleDeleteRequest = (clientId: number) => {
    setClientToDelete(clientId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setClientToDelete(null);
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (clientToDelete === null) return;
    try {
      await clientService.deleteClient(clientToDelete);
      mutate("/clients");
    } catch (err: any) {
      alert(err.message || "Error al eliminar el cliente.");
    } finally {
      handleCloseModal();
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const clientsToImport = json.map((row) => ({
          code: row["nro de cliente"] || row["Nro de Cliente"],
          name: row["empresa"] || row["Empresa"],
          fiscal_id: row["cuit"] || row["CUIT"],
          contact: row["contacto"] || row["Contacto"],
          address: row["direccion"] || row["Direccion"] || "",
          fiscal_id_type: row["cuit"] || row["CUIT"] ? "CUIT" : "",
        }));

        if (clientsToImport.length > 0) {
          const response = await clientService.bulkCreateClients(
            clientsToImport
          );
          alert(
            `Importación completada: ${response.imported} clientes nuevos, ${response.duplicates} duplicados ignorados.`
          );
          mutate("/clients");
        }
      } catch (error) {
        alert("Hubo un error al procesar el archivo.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (error) return <div>Error al cargar los clientes.</div>;
  if (isLoading) return <div>Cargando...</div>;

  return (
    <>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="Eliminar Cliente"
        message="¿Estás seguro de que quieres eliminar este cliente? Se eliminarán también todas sus Órdenes de Trabajo asociadas. Esta acción no se puede deshacer."
      />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" /> Importar
            </Button>
            <Button onClick={() => navigate("/clientes/crear")}>
              <PlusCircle className="mr-2 h-4 w-4" /> Agregar Cliente
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileImport}
              className="hidden"
              accept=".xlsx, .xls"
            />
          </div>
        </div>
        <Card>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Nº Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Contacto Principal
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {clients?.map((client) => (
                <tr key={client.id}>
                  <td className="px-6 py-4">{client.code}</td>
                  <td className="px-6 py-4 font-medium">{client.name}</td>
                  <td className="px-6 py-4">
                    {Array.isArray(client.contacts) &&
                    client.contacts.length > 0
                      ? client.contacts
                          .map((contact: any) =>
                            typeof contact === "string"
                              ? contact
                              : contact.name || contact.email || "Contacto"
                          )
                          .join(", ")
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/clientes/editar/${client.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteRequest(client.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
};

export default Clientes;
