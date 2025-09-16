// RUTA: consultar/src/pages/Estadisticas.tsx

import { useEffect, useState } from "react";
import {
  getEstadisticasCobranza,
  getEstadisticasFacturacion,
  getPagos,
  getEstadisticasOT,
} from "../services/statisticsService";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { useTheme } from "../contexts/ThemeContext";

// --- Interfaces para definir la estructura de los datos que esperamos del backend ---
interface EstadisticasMonto {
  total?: number;
  pendientes?: number;
  vencidas?: number;
}
interface Pago {
  id: number;
  numero_recibo: string;
  monto: number;
  numero_factura: string | null;
}
interface EstadisticasOT {
  cobranzaPorTipoOT: { type: string; monto: number }[];
  facturacionPorTipoOT: { type: string; monto: number }[];
  otsAbiertas: number;
  otsPendientesPorTipo: { type: string; cantidad: number }[];
  topClientes: { name: string; monto: number }[];
}

// Registrar los componentes de ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Componente para mostrar mientras cargan los datos
const LoadingSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md animate-pulse">
    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
  </div>
);

const Estadisticas = () => {
  // --- Estados tipados para mayor seguridad y autocompletado ---
  const [estadisticasCobranza, setEstadisticasCobranza] =
    useState<EstadisticasMonto | null>(null);
  const [estadisticasFacturacion, setEstadisticasFacturacion] =
    useState<EstadisticasMonto | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [estadisticasOT, setEstadisticasOT] = useState<EstadisticasOT | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  // Hook para cargar todos los datos de forma concurrente
  useEffect(() => {
    const fetchEstadisticas = async () => {
      try {
        setLoading(true);
        const [cobranza, facturacion, pagosData, otData] = await Promise.all([
          getEstadisticasCobranza(),
          getEstadisticasFacturacion(),
          getPagos(),
          getEstadisticasOT(),
        ]);

        setEstadisticasCobranza(cobranza);
        setEstadisticasFacturacion(facturacion);
        setPagos(pagosData);
        setEstadisticasOT(otData);
      } catch (error) {
        console.error("Error al cargar las estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstadisticas();
  }, []);

  // --- CONFIGURACIÓN DINÁMICA DE GRÁFICOS PARA MODO OSCURO ---
  const textColor = theme === "dark" ? "#E5E7EB" : "#1F2937";
  const gridColor =
    theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: textColor } },
      tooltip: { titleColor: textColor, bodyColor: textColor },
    },
    scales: {
      y: { ticks: { color: textColor }, grid: { color: gridColor } },
      x: {
        ticks: { color: textColor },
        grid: { color: gridColor, display: false },
      },
    },
  };

  const pieChartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: textColor, boxWidth: 20 },
        position: "bottom" as const,
      },
      tooltip: { titleColor: textColor, bodyColor: textColor },
    },
  };

  // --- PREPARACIÓN DE DATOS PARA LOS GRÁFICOS ---
  const cobranzaPorTipoOTData = {
    labels: estadisticasOT?.cobranzaPorTipoOT?.map((d) => d.type) || [],
    datasets: [
      {
        label: "Cobranza por Tipo de OT",
        data: estadisticasOT?.cobranzaPorTipoOT?.map((d) => d.monto) || [],
        backgroundColor: "#2dd4bf",
        borderColor: "#0d9488",
        borderWidth: 1,
      },
    ],
  };

  const facturacionPorTipoOTData = {
    labels: estadisticasOT?.facturacionPorTipoOT?.map((d) => d.type) || [],
    datasets: [
      {
        label: "Facturación por Tipo de OT",
        data: estadisticasOT?.facturacionPorTipoOT?.map((d) => d.monto) || [],
        backgroundColor: "#a78bfa",
        borderColor: "#7c3aed",
        borderWidth: 1,
      },
    ],
  };

  const otsPendientesPorTipoData = {
    labels: estadisticasOT?.otsPendientesPorTipo?.map((d) => d.type) || [],
    datasets: [
      {
        data:
          estadisticasOT?.otsPendientesPorTipo?.map((d) => d.cantidad) || [],
        backgroundColor: [
          "#fb7185",
          "#60a5fa",
          "#facc15",
          "#4ade80",
          "#c084fc",
        ],
        borderColor: theme === "dark" ? "#1f2937" : "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
          Estadísticas
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 text-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">Estadísticas</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <h2 className="text-md font-semibold text-gray-500 dark:text-gray-400">
            Cobranza Total
          </h2>
          <p className="text-3xl font-bold mt-1">
            ${(estadisticasCobranza?.total || 0).toLocaleString("es-AR")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <h2 className="text-md font-semibold text-gray-500 dark:text-gray-400">
            Facturación Total
          </h2>
          <p className="text-3xl font-bold mt-1">
            ${(estadisticasFacturacion?.total || 0).toLocaleString("es-AR")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <h2 className="text-md font-semibold text-gray-500 dark:text-gray-400">
            Pendientes
          </h2>
          <p className="text-3xl font-bold text-yellow-500 mt-1">
            $
            {(estadisticasFacturacion?.pendientes || 0).toLocaleString("es-AR")}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <h2 className="text-md font-semibold text-gray-500 dark:text-gray-400">
            Vencidas
          </h2>
          <p className="text-3xl font-bold text-red-500 mt-1">
            ${(estadisticasFacturacion?.vencidas || 0).toLocaleString("es-AR")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Cobranza por Tipo de OT
          </h2>
          <div className="h-72">
            <Bar data={cobranzaPorTipoOTData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Facturación por Tipo de OT
          </h2>
          <div className="h-72">
            <Bar data={facturacionPorTipoOTData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Pagos Recientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b-2 border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-3 font-semibold text-sm">Recibo</th>
                  <th className="p-3 font-semibold text-sm">Monto</th>
                  <th className="p-3 font-semibold text-sm">
                    Factura Relacionada
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagos.length > 0 ? (
                  pagos.map((pago) => (
                    <tr
                      key={pago.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="p-3">{pago.numero_recibo}</td>
                      <td className="p-3">
                        ${pago.monto.toLocaleString("es-AR")}
                      </td>
                      <td className="p-3">{pago.numero_factura || "N/A"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center p-4 text-gray-500">
                      No hay pagos recientes para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            OTs Pendientes por Tipo
          </h2>
          <div className="h-72">
            <Pie data={otsPendientesPorTipoData} options={pieChartOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold">OTs Abiertas</h2>
          <p className="text-6xl font-bold mt-4">
            {estadisticasOT?.otsAbiertas || 0}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Top Clientes (por facturación)
          </h2>
          <ul className="space-y-3 mt-4">
            {estadisticasOT?.topClientes &&
            estadisticasOT.topClientes.length > 0 ? (
              estadisticasOT.topClientes.map((cliente, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center text-sm"
                >
                  <span>{cliente.name}</span>
                  <span className="font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-1 rounded-full">
                    ${cliente.monto.toLocaleString("es-AR")}
                  </span>
                </li>
              ))
            ) : (
              <p className="text-center p-4 text-gray-500">
                No hay datos de clientes para mostrar.
              </p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Estadisticas;
