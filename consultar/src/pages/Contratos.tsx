// RUTA: /cliente/src/pages/Contratos.tsx

import React, { useState, useRef } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "../api/axiosInstance";
import { Contract, contractService } from "../services/contractService";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Save, FileSignature, Upload, FileText, XCircle } from "lucide-react";
import axiosInstance from "../api/axiosInstance";

const staticBaseUrl = axiosInstance.defaults.baseURL?.replace("/api", "") || "";

const Contratos: React.FC = () => {
  const {
    data: contracts,
    error,
    isLoading,
  } = useSWR<Contract[]>("/contracts", fetcher);
  const [editingContractId, setEditingContractId] = useState<number | null>(
    null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleEdit = (contractId: number) => {
    setEditingContractId(contractId);
    setSelectedFile(null);
  };

  const handleCancel = () => {
    setEditingContractId(null);
    setSelectedFile(null);
  };

  const handleSave = async (contractToSave: Contract) => {
    if (!selectedFile) {
      alert("Por favor, selecciona un archivo PDF para subir.");
      return;
    }
    setIsSaving(true);
    try {
      await contractService.updateContract(
        contractToSave.id,
        contractToSave.content,
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

  if (isLoading) return <div>Cargando contratos...</div>;
  if (error) return <div>Error al cargar los contratos.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Gestión de Contratos PDF</h1>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/pdf"
        onChange={handleFileChange}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contracts?.map((contract) => (
          <Card key={contract.id} className="flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <FileSignature /> {contract.name}
              </h2>

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
                    <p className="text-sm text-gray-500">No hay PDF subido.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Sube un archivo para ver la previsualización aquí.
                    </p>
                  </div>
                )}
              </div>

              {editingContractId === contract.id && (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-sm font-medium">
                      Subir Nuevo PDF (reemplazará el actual)
                    </label>
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Seleccionar Archivo
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
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t dark:border-gray-700">
              {editingContractId === contract.id ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSave(contract)}
                    disabled={isSaving || !selectedFile}
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
                  onClick={() => handleEdit(contract.id)}
                  variant="secondary"
                  className="w-full"
                >
                  Cambiar PDF
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Contratos;
