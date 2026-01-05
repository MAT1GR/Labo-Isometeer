// RUTA: /consultar/src/pages/Contratos.tsx

import React, { useState, useRef, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "../api/axiosInstance";
import { Contract, contractService } from "../services/contractService";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import {
  Save,
  FileSignature,
  Upload,
  FileText,
  XCircle,
  Trash2,
  PlusCircle,
} from "lucide-react";
import axiosInstance from "../api/axiosInstance";
import ConfirmationModal from "../components/ui/ConfirmationModal";
import { useTitle } from "../contexts/TitleContext";

const staticBaseUrl = axiosInstance.defaults.baseURL?.replace("/api", "") || "";

const Contratos: React.FC = () => {
  const { setTitle } = useTitle();
  useEffect(() => {
    setTitle("Gestión de Contratos PDF");
  }, [setTitle]);

  const {
    data: contracts,
    error,
    isLoading,
  } = useSWR<Contract[]>("/contracts", fetcher);

  // Estados para edición
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Estados para creación
  const [isCreating, setIsCreating] = useState(false);
  const [newContractName, setNewContractName] = useState("");
  const [newContractFile, setNewContractFile] = useState<File | null>(null);

  // Estados para el modal de eliminación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(
    null
  );

  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (isCreating) {
        setNewContractFile(e.target.files[0]);
      } else {
        setSelectedFile(e.target.files[0]);
      }
    }
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract({ ...contract }); // Copia para editar
    setSelectedFile(null);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setEditingContract(null);
    setSelectedFile(null);
    setIsCreating(false);
    setNewContractName("");
    setNewContractFile(null);
  };

  const handleSave = async () => {
    if (!editingContract) return;
    setIsSaving(true);
    try {
      await contractService.updateContract(
        editingContract.id,
        editingContract.name,
        selectedFile
      );
      mutate("/contracts");
      handleCancel();
    } catch (err) {
      alert("Error al guardar el contrato.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newContractName || !newContractFile) {
      alert("Por favor, completa el nombre y selecciona un archivo PDF.");
      return;
    }
    setIsSaving(true);
    try {
      await contractService.createContract(newContractName, newContractFile);
      mutate("/contracts");
      handleCancel();
    } catch (err) {
      alert("Error al crear el contrato.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRequest = (contract: Contract) => {
    setContractToDelete(contract);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!contractToDelete) return;
    try {
      await contractService.deleteContract(contractToDelete.id);
      mutate("/contracts");
      setIsModalOpen(false);
      setContractToDelete(null);
    } catch (error) {
      alert("Error al eliminar el contrato.");
    }
  };

  if (isLoading) return <div>Cargando contratos...</div>;
  if (error) return <div>Error al cargar los contratos.</div>;

  return (
    <>
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Contrato"
        message={`¿Estás seguro de que quieres eliminar el contrato "${contractToDelete?.name}"? Esta acción no se puede deshacer.`}
      />
      <div className="space-y-6">
        <div className="flex justify-end">
          {!isCreating && (
            <Button
              onClick={() => {
                setIsCreating(true);
                setEditingContract(null);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Contrato
            </Button>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="application/pdf"
          onChange={handleFileChange}
        />

        {isCreating && (
          <Card>
            <h2 className="text-xl font-semibold mb-4">Nuevo Contrato</h2>
            <div className="space-y-4">
              <Input
                label="Nombre del Contrato"
                value={newContractName}
                onChange={(e) => setNewContractName(e.target.value)}
                placeholder="Ej: Contrato de Mantenimiento"
              />
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {newContractFile ? "Cambiar PDF" : "Seleccionar PDF"}
                </Button>
                {newContractFile && (
                  <div className="mt-2 text-sm text-green-600">
                    Archivo seleccionado: {newContractFile.name}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Creando..." : "Crear"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contracts?.map((contract) => (
            <Card key={contract.id} className="flex flex-col">
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-semibold flex items-center gap-2 mb-4 flex-grow">
                    <FileSignature />
                    {editingContract?.id === contract.id ? (
                      <Input
                        value={editingContract.name}
                        onChange={(e) =>
                          setEditingContract({
                            ...editingContract,
                            name: e.target.value,
                          })
                        }
                        className="text-xl font-semibold !p-1"
                      />
                    ) : (
                      contract.name
                    )}
                  </h2>
                  {editingContract?.id !== contract.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="!p-1"
                      onClick={() => handleDeleteRequest(contract)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>

                <div className="mb-4">
                  {contract.pdf_path ? (
                    <iframe
                      src={`${staticBaseUrl}/${contract.pdf_path}#toolbar=0&navpanes=0&scrollbar=0`}
                      title={`Previsualización de ${contract.name}`}
                      className="w-full h-64 rounded-md border dark:border-gray-700"
                    ></iframe>
                  ) : (
                    <div className="w-full h-64 rounded-md border-2 border-dashed dark:border-gray-700 flex flex-col items-center justify-center text-center p-4 bg-gray-50 dark:bg-gray-700/50">
                      <FileText size={40} className="text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">
                        No hay PDF subido.
                      </p>
                    </div>
                  )}
                </div>

                {editingContract?.id === contract.id && (
                  <div className="space-y-3 mb-4">
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Seleccionar Nuevo PDF (Opcional)
                      </Button>
                    </div>
                    {selectedFile && (
                      <div className="mt-2 flex items-center justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
                        <p className="text-sm text-green-800 dark:text-green-300 truncate">
                          {selectedFile.name}
                        </p>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 border-t dark:border-gray-700">
                {editingContract?.id === contract.id ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button variant="ghost" onClick={handleCancel}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleEdit(contract)}
                    variant="secondary"
                    className="w-full"
                  >
                    Editar
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};

export default Contratos;
