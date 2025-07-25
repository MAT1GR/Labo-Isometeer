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
  PieChart as PieIcon,
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { otService, TimelineOt } from "../services/otService";
import useSWR from "swr";
import { fetcher } from "../api/axiosInstance";
import Button from "../components/ui/Button";

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
interface MonthlyRevenue {
  month: string;
  revenue: number;
}

// --- VISTA PARA ADMINISTRADORES Y DIRECTORES ---
const AdminDirectorDashboard: React.FC = () => {
  const { data, error, isLoading } = useSWR<{
    stats: DashboardStats;
    recentOrders: RecentOrder[];
    monthlyRevenue: MonthlyRevenue[];
  }>("/dashboard/stats", fetcher);

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

  const { stats, recentOrders, monthlyRevenue } = data;

  const otStatusData = [
    { name: "Pendientes", value: stats.pendingOT, fill: "#f59e0b" },
    { name: "En Progreso", value: stats.inProgressOT, fill: "#3b82f6" },
    { name: "Finalizadas", value: stats.completedOT, fill: "#22c55e" },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard General</h1>

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
            <p className="text-sm font-medium">Ingresos (Simulado)</p>
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-3xl font-bold">
            {formatCurrency(stats.totalRevenue)}
          </p>
        </Card>
        <Card>
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Facturas Vencidas</p>
            <Clock className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-3xl font-bold">{stats.overdueInvoices}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp /> Ingresos Mensuales (Simulado)
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  strokeOpacity={0.2}
                />
                <XAxis
                  dataKey="month"
                  fontSize={12}
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  tickFormatter={(value) => `$${Number(value) / 1000}k`}
                  fontSize={12}
                  tick={{ fill: "currentColor" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(200, 200, 200, 0.1)" }}
                  contentStyle={{
                    backgroundColor: "rgba(30,41,59,0.9)",
                    border: "none",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "#cbd5e1" }}
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Ingresos",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PieIcon /> Estado de OTs
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={otStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {otStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(30,41,59,0.9)",
                    border: "none",
                    borderRadius: "0.5rem",
                  }}
                  itemStyle={{ color: "#cbd5e1" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
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
                    stroke="currentColor"
                    strokeOpacity={0.2}
                  />
                  <XAxis
                    type="number"
                    domain={[1, daysInMonth]}
                    ticks={Array.from({ length: daysInMonth }, (_, i) => i + 1)}
                    allowDecimals={false}
                    tick={{ fill: "currentColor", fontSize: 12 }}
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
