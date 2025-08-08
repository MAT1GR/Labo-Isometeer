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

  // REEMPLAZAR ESTA FUNCIÓN
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        if (workbook.SheetNames.length < 2) {
          alert(
            "El archivo Excel debe contener dos hojas: una para clientes y otra para contactos."
          );
          return;
        }

        const clientSheetName = workbook.SheetNames[0];
        const clientWorksheet = workbook.Sheets[clientSheetName];
        const clientsJson = XLSX.utils.sheet_to_json(clientWorksheet) as any[];

        const contactSheetName = workbook.SheetNames[1];
        const contactWorksheet = workbook.Sheets[contactSheetName];
        const contactsJson = XLSX.utils.sheet_to_json(
          contactWorksheet
        ) as any[];

        const contactsByClientCode = new Map<string, any[]>();
        for (const contactRow of contactsJson) {
          const clientCode =
            contactRow["nro de cliente"] || contactRow["Nro de Cliente"];
          if (!clientCode) continue;

          if (!contactsByClientCode.has(clientCode)) {
            contactsByClientCode.set(clientCode, []);
          }
          contactsByClientCode.get(clientCode)!.push({
            type: contactRow["type"] || contactRow["Type"] || "Referente",
            name: contactRow["contact"] || contactRow["Contacto"],
            email: contactRow["email"] || contactRow["Email"],
            phone:
              contactRow["telf"] ||
              contactRow["Telf"] ||
              contactRow["telefono"] ||
              contactRow["Telefono"],
          });
        }

        const clientsToImport = clientsJson.map((clientRow) => {
          const clientCode =
            clientRow["nro de cliente"] || clientRow["Nro de Cliente"];

          let fiscalIdType = "";
          let fiscalId = "";
          const cuitData = clientRow["cuit"] || clientRow["CUIT"];

          try {
            if (typeof cuitData === "string" && cuitData.includes("{")) {
              const parsedCuit = JSON.parse(cuitData);
              fiscalIdType = parsedCuit.type || "CUIT";
              fiscalId = parsedCuit.value || "";
            } else if (cuitData) {
              fiscalId = String(cuitData);
              fiscalIdType = "CUIT";
            }
          } catch {
            fiscalId = String(cuitData); // Fallback
          }

          return {
            code: clientCode,
            name: clientRow["empresa"] || clientRow["Empresa"],
            client_number:
              clientRow["N° Cliente"] || clientRow["client_number"],
            address: clientRow["direccion"] || clientRow["Direccion"] || "",
            fiscal_id_type: fiscalIdType,
            fiscal_id: fiscalId,
            contacts: contactsByClientCode.get(String(clientCode)) || [],
          };
        });

        if (clientsToImport.length > 0) {
          const response = await clientService.bulkCreateClients(
            clientsToImport
          );
          alert(
            `Importación completada: ${response.importedClients} clientes nuevos, ${response.importedContacts} contactos añadidos, ${response.duplicates} clientes duplicados ignorados.`
          );
          mutate("/clients");
        } else {
          alert("No se encontraron clientes para importar en la primera hoja.");
        }
      } catch (error: any) {
        console.error("Error al procesar el archivo:", error);
        alert(
          error.response?.data?.error ||
            "Hubo un error al procesar el archivo. Asegúrate de que las columnas son correctas y que la segunda hoja tiene una columna 'nro de cliente' para vincular los contactos."
        );
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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
                  Código Cliente
                </th>
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
                  <td className="px-6 py-4">{client.client_number || "N/A"}</td>
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
