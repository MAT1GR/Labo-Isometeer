// RUTA: /cliente/src/pages/Dashboard.tsx

import React, { useMemo, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/ui/Card";
import { formatCurrency, formatDate } from "../lib/utils";
import {
  FileText,
  Users,
  Smile,
  BarChart3,
  ListTodo,
  TrendingUp,
  PieChart as PieIcon,
  Loader,
  AlertCircle,
  Clock,
  ChevronRight,
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { otService, UserSummaryItem } from "../services/otService";
import useSWR from "swr";
import { fetcher } from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";

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

// --- NUEVO DASHBOARD DEL EMPLEADO ---
const EmpleadoDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    data: summaryData,
    error,
    isLoading,
  } = useSWR(
    user ? `/ots/user-summary/${user.id}` : null,
    () => otService.getUserSummary(user!.id)
  );

  const inProgressRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef<HTMLDivElement>(null);

  const { chartData, pending, inProgress, completed } = useMemo(() => {
    if (!summaryData) {
      return { chartData: [], pending: [], inProgress: [], completed: [] };
    }
    const pending = summaryData.filter((t) => t.status === "pendiente");
    const inProgress = summaryData.filter((t) => t.status === "en_progreso");
    const completed = summaryData.filter((t) => t.status === "finalizada");

    const chartData = [
      { name: "En Progreso", Tareas: inProgress.length, fill: "#3b82f6" },
      { name: "Pendientes", Tareas: pending.length, fill: "#f59e0b" },
      { name: "Finalizadas", Tareas: completed.length, fill: "#22c55e" },
    ];
    return { chartData, pending, inProgress, completed };
  }, [summaryData]);

  const handleBarClick = (data: any) => {
    const status = data.activePayload[0].payload.name;
    let ref;
    if (status === "En Progreso") ref = inProgressRef;
    if (status === "Pendientes") ref = pendingRef;
    if (status === "Finalizadas") ref = completedRef;

    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const TaskCard: React.FC<{ task: UserSummaryItem }> = ({ task }) => (
    <div
      className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
      onClick={() => navigate(`/ot/editar/${task.id}`)}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-blue-600 dark:text-blue-400">
            {task.custom_id}
          </p>
          <p className="text-sm font-semibold">{task.product}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {task.client_name}
          </p>
        </div>
        <div className="text-right flex items-center gap-2">
          <div>
            <p className="text-xs font-medium capitalize">{task.activity}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(task.ot_date)}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
        <Smile className="h-12 w-12 mx-auto text-blue-500" />
        <h1 className="mt-2 text-3xl font-bold">¡Hola, {user?.name}!</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Este es el resumen de tus tareas activas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 /> Tareas por Estado
          </h2>
          <div className="h-60">
            {isLoading && <Loader className="animate-spin" />}
            {error && <AlertCircle className="text-red-500" />}
            {summaryData && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  barSize={25}
                  onClick={handleBarClick}
                >
                  <CartesianGrid
                    stroke="currentColor"
                    strokeOpacity={0.1}
                    horizontal={false}
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "currentColor", fontSize: 14 }}
                    width={90}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(200, 200, 200, 0.1)" }}
                    contentStyle={{
                      backgroundColor: "rgba(30,41,59,0.9)",
                      border: "none",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Bar dataKey="Tareas" cursor="pointer">
                    <LabelList
                      dataKey="Tareas"
                      position="right"
                      offset={10}
                      fill="currentColor"
                      fontSize={14}
                      fontWeight="bold"
                    />
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card ref={inProgressRef}>
            <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
              En Progreso ({inProgress.length})
            </h2>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {inProgress.length > 0 ? (
                inProgress.map((task) => (
                  <TaskCard key={`${task.id}-${task.activity}`} task={task} />
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  Ninguna tarea en progreso.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ListTodo /> Lista de Tareas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div ref={pendingRef}>
            <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-3">
              Pendientes ({pending.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {pending.length > 0 ? (
                pending.map((task) => (
                  <TaskCard key={`${task.id}-${task.activity}`} task={task} />
                ))
              ) : (
                <p className="text-sm text-gray-500">¡Sin pendientes!</p>
              )}
            </div>
          </div>
          <div ref={completedRef}>
            <h3 className="font-semibold text-green-600 dark:text-green-400 mb-3">
              Finalizadas ({completed.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {completed.length > 0 ? (
                completed.map((task) => (
                  <TaskCard key={`${task.id}-${task.activity}`} task={task} />
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No hay tareas finalizadas recientemente.
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- Componente Principal del Dashboard ---
const Dashboard: React.FC = () => {
  const { canViewAdminContent } = useAuth();
  return canViewAdminContent() ? (
    <AdminDirectorDashboard />
  ) : (
    <EmpleadoDashboard />
  );
};

export default Dashboard;