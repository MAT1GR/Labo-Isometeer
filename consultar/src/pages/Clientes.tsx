// RUTA: /cliente/src/pages/Clientes.tsx

import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clientService, Client } from "../services/clientService";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  PlusCircle,
  Users,
  Trash2,
  Upload,
  Edit,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import useSWR, { mutate } from "swr";
import { fetcher } from "../api/axiosInstance";
import * as XLSX from "xlsx";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import Input from "../components/ui/Input";
import { useTitle } from "../contexts/TitleContext";

const CLIENTS_PER_PAGE = 50;

const Clientes: React.FC = () => {
  const { setTitle } = useTitle();
  useEffect(() => {
    setTitle("Gestión de Clientes");
  }, [setTitle]);

  const {
    data: clients,
    error,
    isLoading,
  } = useSWR<Client[]>("/clients", fetcher);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topOfListRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    const lowercasedFilter = searchTerm.toLowerCase();
    return clients.filter((client) => {
      return (
        client.name?.toLowerCase().includes(lowercasedFilter) ||
        client.code?.toLowerCase().includes(lowercasedFilter) ||
        client.client_number?.toLowerCase().includes(lowercasedFilter) ||
        client.fiscal_id?.toLowerCase().includes(lowercasedFilter) ||
        client.address?.toLowerCase().includes(lowercasedFilter) ||
        client.location?.toLowerCase().includes(lowercasedFilter) ||
        client.province?.toLowerCase().includes(lowercasedFilter)
      );
    });
  }, [clients, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);



  const totalPages = Math.ceil(filteredClients.length / CLIENTS_PER_PAGE);
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * CLIENTS_PER_PAGE;
    return filteredClients.slice(startIndex, startIndex + CLIENTS_PER_PAGE);
  }, [filteredClients, currentPage]);

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
      <div className="space-y-6 py-10" ref={topOfListRef}>
        <div className="flex justify-end gap-2">
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por nombre, código, nº de cliente, CUIT, dirección..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-card text-card-foreground shadow-xl border border-border rounded-lg overflow-hidden">
          <div className="overflow-y-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Código Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Nº Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {paginatedClients?.map((client) => (
                  <tr key={client.id} className="cursor-pointer hover:bg-muted/50" onDoubleClick={() => navigate(`/clientes/editar/${client.id}`)}>
                    <td className="px-6 py-4">{client.code}</td>
                    <td className="px-6 py-4">
                      {client.client_number
                        ? String(client.client_number).replace(/\.0$/, "")
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 font-medium">{client.name}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clientes/editar/${client.id}`);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRequest(client.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default Clientes;
