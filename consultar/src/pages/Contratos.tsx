// RUTA: /cliente/src/pages/Contratos.tsx

import React, { useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "../api/axiosInstance";
import { Contract, contractService } from "../services/contractService";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Save, FileSignature, Upload, File } from "lucide-react";
import axiosInstance from "../api/axiosInstance";

const Contratos: React.FC = () => {
  const {
    data: contracts,
    error,
    isLoading,
  } = useSWR<Contract[]>("/contracts", fetcher);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setContent(contract.content);
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!editingContract) return;
    setIsSaving(true);
    try {
      await contractService.updateContract(
        editingContract.id,
        content,
        selectedFile
      );
      mutate("/contracts");
      setEditingContract(null);
      setSelectedFile(null);
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
      <h1 className="text-3xl font-bold">Gestión de Contratos</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {contracts?.map((contract) => (
          <Card key={contract.id}>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <FileSignature /> {contract.name}
            </h2>
            {editingContract?.id === contract.id ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Texto del Contrato (si no hay PDF)
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-40 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Subir PDF (reemplazará el actual)
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <label className="cursor-pointer bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <Upload className="h-4 w-4" />
                      Seleccionar Archivo
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf"
                        onChange={handleFileChange}
                      />
                    </label>
                    {selectedFile && (
                      <span className="text-sm text-gray-500">
                        {selectedFile.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditingContract(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-40 overflow-y-auto p-2 border rounded-md dark:border-gray-700">
                  <h3 className="font-semibold mb-2">Texto del Contrato:</h3>
                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap text-sm">
                    {contract.content}
                  </p>
                </div>
                <div className="p-2 border rounded-md dark:border-gray-700">
                  <h3 className="font-semibold mb-2">Archivo PDF:</h3>
                  {contract.pdf_path ? (
                    <a
                      href={`${axiosInstance.defaults.baseURL}/${contract.pdf_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline flex items-center gap-2"
                    >
                      <File className="h-4 w-4" /> Ver PDF Actual
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">No hay PDF subido.</p>
                  )}
                </div>
                <Button onClick={() => handleEdit(contract)}>Editar</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Contratos;
