// RUTA: /consultar/src/components/ui/OtHistoryModal.tsx

import React, { useEffect, useState } from "react";
import { otService } from "../../services/otService";
import Modal from "./Modal";
import { formatDateTime } from "../../lib/utils";
import { History } from "lucide-react";

interface OtHistoryEntry {
  id: number;
  changed_at: string;
  changes: string;
  username: string;
}

interface OtHistoryModalProps {
  otId: number;
  isOpen: boolean;
  onClose: () => void;
}

const OtHistoryModal: React.FC<OtHistoryModalProps> = ({
  otId,
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<OtHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const fetchHistory = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await otService.getOtHistory(otId);
          setHistory(data);
        } catch (err) {
          setError("No se pudo cargar el historial de cambios.");
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [otId, isOpen]);

  // El return principal ahora maneja si se renderiza o no,
  // por lo que no necesitamos el `if (!isOpen) return null;` aquí.

  return (
    // --- AQUÍ PASAMOS LA PROP 'isOpen' QUE FALTABA ---
    <Modal
      title="Historial de Cambios de la OT"
      onClose={onClose}
      isOpen={isOpen}
    >
      <div className="p-6 max-h-[70vh] overflow-y-auto">
        {loading && <p>Cargando historial...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading &&
          !error &&
          (history.length > 0 ? (
            <ul className="space-y-4">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="p-4 border rounded-md bg-gray-50 dark:bg-gray-900/50"
                >
                  <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 mb-2">
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {entry.username}
                    </span>
                    <span>{formatDateTime(entry.changed_at)}</span>
                  </div>
                  <div className="text-sm">
                    <ul className="list-disc list-inside pl-2 space-y-1 text-gray-700 dark:text-gray-200">
                      {JSON.parse(entry.changes).map(
                        (change: string, index: number) => (
                          <li key={index}>{change}</li>
                        )
                      )}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <History className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                Sin Historial
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No se han registrado cambios para esta OT.
              </p>
            </div>
          ))}
      </div>
    </Modal>
  );
};

export default OtHistoryModal;
