// RUTA: /cliente/src/pages/AdminFavicon.tsx

import React, { useState, useRef, useEffect } from "react";
import { useTitle } from "../contexts/TitleContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { Image, Upload, Save, AlertCircle } from "lucide-react";
import { adminService } from "../services/adminService";

const AdminFavicon: React.FC = () => {
  const { setTitle } = useTitle();
  useEffect(() => {
    setTitle("Cambiar Favicon");
  }, [setTitle]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("/logo.ico");
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (
      file &&
      ["image/x-icon", "image/png", "image/svg+xml", "image/jpeg"].includes(
        file.type
      )
    ) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setMessage(null);
    } else {
      setMessage({
        type: "error",
        text: "Por favor, selecciona un archivo de imágen válido (.ico, .png, .svg, .jpg).",
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setMessage({
        type: "error",
        text: "Por favor, selecciona un archivo primero.",
      });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      await adminService.uploadFavicon(selectedFile);
      setMessage({
        type: "success",
        text: "¡Favicon actualizado! Refresca la página (Ctrl+F5) para ver los cambios.",
      });
    } catch (error) {
      setMessage({ type: "error", text: "Hubo un error al subir el archivo." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Image className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold">
            Actualizar Ícono de la Aplicación
          </h2>
        </div>

        <div className="flex flex-col items-center text-center mt-8">
          <p className="font-medium mb-4 text-gray-800 dark:text-gray-200">
            Previsualización:
          </p>
          <div className="inline-block p-4 border rounded-lg bg-white dark:bg-gray-800 shadow-inner mb-6">
            <img src={preview} alt="Favicon Preview" className="h-24 w-24" />
          </div>

          <input
            type="file"
            accept="image/x-icon, image/png, image/svg+xml, image/jpeg"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Seleccionar Archivo
          </Button>
          {selectedFile && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Archivo seleccionado: <strong>{selectedFile.name}</strong>
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-end items-center gap-4 border-t dark:border-gray-700 pt-6">
          {message && (
            <p
              className={`text-sm ${
                message.type === "success" ? "text-green-600" : "text-red-600"
              } mr-auto`}
            >
              {message.text}
            </p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
          >
            <Save className="mr-2 h-4 w-4" />
            {isUploading ? "Subiendo..." : "Guardar Favicon"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminFavicon;
