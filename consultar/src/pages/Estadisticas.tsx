// RUTA: /cliente/src/pages/Estadisticas.tsx

import React from "react";
import useSWR from "swr";
import { fetcher } from "../api/axiosInstance";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  Briefcase,
  Users,
  User,
  Download,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { exportStatisticsPdf } from "../services/pdfGenerator";
import { formatCurrency } from "../lib/utils";

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

const Estadisticas: React.FC = () => {
  const { data, error, isLoading } = useSWR("/statistics/all", fetcher);

  if (isLoading)
    return <div className="text-center p-8">Cargando estadísticas...</div>;
  if (error)
    return (
      <div className="text-center p-8 text-red-500">
        Error al cargar las estadísticas.
      </div>
    );

  const handleExport = () => {
    if (data) {
      exportStatisticsPdf(data);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">Estadísticas Generales</h1>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar a PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total de OTs
          </p>
          <p className="text-3xl font-bold">{data.summary.totalOTs}</p>
          <Briefcase className="h-8 w-8 text-gray-300 dark:text-gray-600 absolute bottom-4 right-4" />
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total de Clientes
          </p>
          <p className="text-3xl font-bold">{data.summary.totalClients}</p>
          <Users className="h-8 w-8 text-gray-300 dark:text-gray-600 absolute bottom-4 right-4" />
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total de Usuarios
          </p>
          <p className="text-3xl font-bold">{data.summary.totalUsers}</p>
          <User className="h-8 w-8 text-gray-300 dark:text-gray-600 absolute bottom-4 right-4" />
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Ingresos Totales
          </p>
          <p className="text-3xl font-bold">
            {formatCurrency(data.summary.totalRevenue)}
          </p>
          <TrendingUp className="h-8 w-8 text-gray-300 dark:text-gray-600 absolute bottom-4 right-4" />
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Ingreso Promedio / OT
          </p>
          <p className="text-3xl font-bold">
            {formatCurrency(data.summary.averageRevenuePerOT)}
          </p>
          <DollarSign className="h-8 w-8 text-gray-300 dark:text-gray-600 absolute bottom-4 right-4" />
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-4">
          Tendencia de Creación de OTs (Últimos 12 Meses)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.otCreationTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              name="Nº de OTs Creadas"
              stroke="#8884d8"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold mb-4">OTs por Estado</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.otsByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.otsByStatus.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold mb-4">OTs por Tipo</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.otsByType}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={100}
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.otsByType.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-4">
          Top 5 Usuarios por OTs Finalizadas
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.topUsersByCompletedOTs}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" name="OTs Finalizadas" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold mb-4">
          Actividades Más Solicitadas
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data.topActivities}
            layout="vertical"
            margin={{ left: 120 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="activity" type="category" width={100} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" name="Nº de Veces Solicitada" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default Estadisticas;
