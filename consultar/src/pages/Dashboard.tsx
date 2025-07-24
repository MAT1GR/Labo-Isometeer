// RUTA: /cliente/src/pages/Dashboard.tsx

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/ui/Card";
import { formatCurrency, formatDate } from "../lib/utils";
import {
  FileText,
  Users,
  Smile,
  BarChart3,
  Calendar,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  ReferenceLine,
} from "recharts";
import { otService, TimelineOt } from "../services/otService"; // <-- IMPORTACIÓN CORREGIDA
import useSWR from "swr";
import axiosInstance from "../api/axiosInstance";

// --- Interfaces para los datos del dashboard de Admin ---
interface DashboardStats {
  totalOT: number;
  totalClients: number;
  totalRevenue: number;
  paidInvoices: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  pendingOT: number;
  inProgressOT: number;
  completedOT: number;
  billedOT: number;
}
interface RecentOrder {
  id: number;
  client_name: string;
  product: string;
  status: string;
  date: string;
}

// --- VISTA PARA ADMINISTRADORES Y DIRECTORES ---
const AdminDirectorDashboard: React.FC = () => {
  const { data, error, isLoading } = useSWR("/dashboard/stats", (url) =>
    axiosInstance.get(url).then((res) => res.data)
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
      case "en_progreso":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
      case "finalizada":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
      case "facturada":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300";
      case "cierre":
        return "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  if (error || !data)
    return <p>No se pudieron cargar los datos del dashboard.</p>;

  const { stats, recentOrders } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Total OT</p>
            <FileText className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-3xl font-bold">{stats.totalOT}</p>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Total Clientes</p>
            <Users className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-3xl font-bold">{stats.totalClients}</p>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Pendientes</p>
            <Clock className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold">{stats.pendingOT}</p>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">En Progreso</p>
            <TrendingUp className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-3xl font-bold">{stats.inProgressOT}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-xl font-semibold mb-4">Órdenes Recientes</h2>
          <div className="space-y-2">
            {recentOrders.length > 0 ? (
              recentOrders.map((order: RecentOrder) => (
                <div
                  key={order.id}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      OT-{order.id}: {order.client_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {order.product}
                    </p>
                  </div>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.replace("_", " ")}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay órdenes de trabajo recientes.
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="text-xl font-semibold mb-4">
              Métricas de Facturación (Simulado)
            </h2>
            <div className="flex justify-around text-center">
              <div>
                <p className="text-sm font-medium">Ingresos</p>
                <p className="text-xl font-bold">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Pagadas</p>
                <p className="text-xl font-bold text-green-600">
                  {stats.paidInvoices}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Vencidas</p>
                <p className="text-xl font-bold text-red-500">
                  {stats.overdueInvoices}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// --- DASHBOARD DEL EMPLEADO RECONSTRUIDO CON GRÁFICO MEJORADO ---
const EmpleadoDashboard: React.FC = () => {
  const { user } = useAuth();
  const [date, setDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const {
    data: timelineData,
    error,
    isLoading,
  } = useSWR(
    user ? `/ots/timeline/${user.id}/${date.year}/${date.month}` : null,
    () =>
      otService.getTimelineData({
        year: date.year,
        month: date.month,
        assigned_to: user!.id,
      })
  );

  const daysInMonth = new Date(date.year, date.month, 0).getDate();
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === date.year && today.getMonth() + 1 === date.month;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "finalizada":
        return "#22c55e";
      case "en_progreso":
        return "#3b82f6";
      case "pendiente":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  const chartData = useMemo(() => {
    if (!timelineData) return [];
    return timelineData
      .map((ot) => {
        const start = new Date(ot.started_at);
        const end = ot.completed_at ? new Date(ot.completed_at) : today;
        let startDay =
          start.getUTCFullYear() === date.year &&
          start.getUTCMonth() + 1 === date.month
            ? start.getUTCDate()
            : 1;
        let endDay =
          end.getUTCFullYear() === date.year &&
          end.getUTCMonth() + 1 === date.month
            ? end.getUTCDate()
            : daysInMonth;
        endDay = Math.min(endDay, daysInMonth);
        startDay = Math.max(startDay, 1);
        return {
          name: ot.custom_id || `OT #${ot.id}`,
          product: ot.product,
          startPadding: startDay - 1,
          duration: endDay - startDay + 1,
          fill: getStatusColor(ot.status),
          startDateStr: formatDate(ot.started_at),
          endDateStr: ot.completed_at
            ? formatDate(ot.completed_at)
            : "En progreso",
          totalDuration: ot.duration_minutes,
        };
      })
      .reverse();
  }, [timelineData, date.year, date.month]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 bg-gray-800 text-white rounded-lg border border-gray-700 shadow-lg">
          <p className="font-bold text-blue-400">{`${label}: ${data.product}`}</p>
          <p className="text-sm">Inició: {data.startDateStr}</p>
          <p className="text-sm">Finalizó: {data.endDateStr}</p>
          {data.totalDuration != null && (
            <p className="text-sm">Tiempo total: {data.totalDuration} min</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <Smile className="h-12 w-12 mx-auto text-blue-500" />
        <h1 className="mt-2 text-3xl font-bold">¡Hola, {user?.name}!</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Este es el resumen de tu actividad mensual.
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 /> Línea de Tiempo de Trabajos
          </h2>
          <div className="flex gap-2">
            <select
              value={date.month}
              onChange={(e) =>
                setDate((d) => ({ ...d, month: Number(e.target.value) }))
              }
              className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("es-AR", { month: "long" })}
                </option>
              ))}
            </select>
            <select
              value={date.year}
              onChange={(e) =>
                setDate((d) => ({ ...d, year: Number(e.target.value) }))
              }
              className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i} value={new Date().getFullYear() - i}>
                  {new Date().getFullYear() - i}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{
            width: "100%",
            height: Math.max(300, chartData.length * 50),
          }}
        >
          {isLoading && (
            <p className="text-center text-gray-500">Cargando gráfico...</p>
          )}
          {error && (
            <p className="text-center text-red-500">
              Error al cargar los datos del gráfico.
            </p>
          )}
          {!isLoading &&
            !error &&
            (chartData.length > 0 ? (
              <ResponsiveContainer>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(128, 128, 128, 0.2)"
                  />
                  <XAxis
                    type="number"
                    domain={[1, daysInMonth]}
                    ticks={Array.from({ length: daysInMonth }, (_, i) => i + 1)}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={140}
                    tick={{ fontSize: 12, fill: "currentColor" }}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(200, 200, 200, 0.1)" }}
                  />
                  <Bar dataKey="startPadding" stackId="a" fill="transparent" />
                  <Bar dataKey="duration" stackId="a" name="Días de trabajo">
                    <LabelList
                      dataKey="duration"
                      position="insideRight"
                      fill="#fff"
                      fontSize={10}
                      formatter={(value: number) => `${value}d`}
                    />
                  </Bar>
                  {isCurrentMonth && (
                    <ReferenceLine
                      x={today.getDate()}
                      stroke="#f87171"
                      strokeWidth={2}
                      label={{ value: "Hoy", position: "top", fill: "#f87171" }}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-gray-500">
                <div>
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 font-semibold">Sin datos para mostrar</p>
                  <p className="text-sm">
                    No hay trabajos iniciados para el mes seleccionado.
                  </p>
                </div>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
};

// --- Componente Principal del Dashboard ---
const Dashboard: React.FC = () => {
  const { isDirectorOrAdmin } = useAuth();
  return isDirectorOrAdmin() ? (
    <AdminDirectorDashboard />
  ) : (
    <EmpleadoDashboard />
  );
};

export default Dashboard;
