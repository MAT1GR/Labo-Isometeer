// RUTA: /cliente/src/pages/Dashboard.tsx

import React, { useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/ui/Card";
import { formatCurrency, formatDate } from "../lib/utils";
import Button from "../components/ui/Button";
import {
  FileText,
  Users,
  TrendingUp,
  PieChart as PieIcon,
  AlertCircle,
  Clock,
  ChevronRight,
  Activity,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { otService, UserSummaryItem } from "../services/otService";
import useSWR from "swr";
import { fetcher } from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";

// --- Interfaces para los datos del dashboard de Admin ---
interface DashboardStats {
  totalOT: number;
  totalClients: number;
  totalRevenue: number;
  paidInvoices: number;
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
  name: string;
  revenue: number;
}

// --- VISTA PARA ADMINISTRADORES Y DIRECTORES ---
const AdminDirectorDashboard: React.FC = () => {
  const [period, setPeriod] = useState("week");
  const navigate = useNavigate();

  const { data, error, isLoading } = useSWR<{
    stats: DashboardStats;
    recentOrders: RecentOrder[];
    monthlyRevenue: MonthlyRevenue[];
  }>(`/dashboard/stats?period=${period}`, fetcher, {
    keepPreviousData: true,
  });

  if (error)
    return (
      <p>
        No se pudieron cargar los datos del dashboard. Verifica que el servidor
        esté corriendo.
      </p>
    );

  const stats = data?.stats;
  const monthlyRevenue = data?.monthlyRevenue;

  const otStatusData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Pendientes", value: stats.pendingOT, fill: "#f59e0b" },
      { name: "En Progreso", value: stats.inProgressOT, fill: "#3b82f6" },
      { name: "Finalizadas", value: stats.completedOT, fill: "#22c55e" },
      { name: "Facturadas", value: stats.billedOT, fill: "#4f46e5" },
      { name: "Cerradas", value: stats.paidInvoices, fill: "#8b5cf6" },
    ].filter((item) => item.value > 0);
  }, [stats]);

  const FilterButtons = () => (
    <div className="flex items-center gap-2">
      <Button
        variant={period === "week" ? "primary" : "outline"}
        size="sm"
        onClick={() => setPeriod("week")}
      >
        Semana
      </Button>
      <Button
        variant={period === "month" ? "primary" : "outline"}
        size="sm"
        onClick={() => setPeriod("month")}
      >
        Mes
      </Button>
      <Button
        variant={period === "year" ? "primary" : "outline"}
        size="sm"
        onClick={() => setPeriod("year")}
      >
        Año
      </Button>
    </div>
  );

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">Dashboard General</h1>
        <FilterButtons />
      </div>

      {isLoading && !stats ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Total OT</p>
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-3xl font-bold">{stats?.totalOT}</p>
            </Card>
            <Card>
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Total Clientes</p>
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-3xl font-bold">{stats?.totalClients}</p>
            </Card>
            <Card>
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Ingresos</p>
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-3xl font-bold">
                {formatCurrency(stats?.totalRevenue || 0)}
              </p>
            </Card>
            {/* --- TARJETA CLAVE --- */}
            {/* Esta tarjeta muestra el contador de facturas vencidas. */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate("/facturacion?estado=vencida")}
            >
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Facturas Vencidas</p>
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-3xl font-bold">{stats?.overdueInvoices}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp /> Ingresos
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyRevenue}>
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="currentColor"
                      strokeOpacity={0.2}
                    />
                    <XAxis
                      dataKey="name"
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
                      labelLine={false}
                      label={renderCustomizedLabel}
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
                    <Legend iconType="circle" iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
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
  } = useSWR(user ? `/ots/user-summary/${user.id}` : null, () =>
    otService.getUserSummary(user!.id)
  );

  const inProgressRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef<HTMLDivElement>(null);

  const { pending, inProgress, completed } = useMemo(() => {
    if (!summaryData) {
      return { pending: [], inProgress: [], completed: [] };
    }
    const pending = summaryData.filter((t) => t.status === "pendiente");
    const inProgress = summaryData.filter((t) => t.status === "en_progreso");
    const completed = summaryData.filter((t) => t.status === "finalizada");
    return { pending, inProgress, completed };
  }, [summaryData]);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const TaskCard: React.FC<{ task: UserSummaryItem }> = ({ task }) => (
    <div
      className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all group"
      onClick={() => navigate(`/ot/editar/${task.id}`)}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold text-blue-600 dark:text-blue-400">
            {task.custom_id}
          </p>
          <p className="text-sm font-semibold">{task.product}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {task.client_name}
          </p>
        </div>
        <div className="text-right flex items-center gap-3">
          <div>
            <p className="text-xs font-medium capitalize">{task.activity}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(task.ot_date)}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
        </div>
      </div>
    </div>
  );

  const StatusCard: React.FC<{
    title: string;
    count: number;
    icon: React.ElementType;
    colorClasses: string;
    onClick: () => void;
  }> = ({ title, count, icon: Icon, colorClasses, onClick }) => (
    <Card
      className={cn(
        "cursor-pointer group hover:shadow-xl hover:-translate-y-1 transition-all",
        colorClasses
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-full">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{title}</p>
            <p className="text-white/80 text-sm">
              {count} {count === 1 ? "tarea" : "tareas"}
            </p>
          </div>
        </div>
        <p className="text-4xl font-bold text-white/90">{count}</p>
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">¡Hola, {user?.name}!</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Bienvenido a tu panel de tareas. Aquí tienes un resumen de tu trabajo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatusCard
          title="En Progreso"
          count={inProgress.length}
          icon={Activity}
          colorClasses="bg-gradient-to-br from-blue-500 to-blue-600"
          onClick={() => scrollTo(inProgressRef)}
        />
        <StatusCard
          title="Pendientes"
          count={pending.length}
          icon={Clock}
          colorClasses="bg-gradient-to-br from-yellow-500 to-yellow-600"
          onClick={() => scrollTo(pendingRef)}
        />
        <StatusCard
          title="Finalizadas"
          count={completed.length}
          icon={CheckCircle2}
          colorClasses="bg-gradient-to-br from-green-500 to-green-600"
          onClick={() => scrollTo(completedRef)}
        />
      </div>

      <div ref={inProgressRef} className="scroll-mt-24">
        <Card>
          <h2 className="text-xl font-semibold mb-4 text-blue-600 dark:text-blue-400">
            <Activity className="inline-block mr-2" />
            En Progreso
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {isLoading ? (
              <p className="text-sm text-gray-500">Cargando tareas...</p>
            ) : inProgress.length > 0 ? (
              inProgress.map((task) => (
                <TaskCard key={`${task.id}-${task.activity}`} task={task} />
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Ninguna tarea en progreso.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card ref={pendingRef} className="scroll-mt-24">
          <h3 className="text-xl font-semibold text-yellow-600 dark:text-yellow-400 mb-3">
            <Clock className="inline-block mr-2" />
            Pendientes
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {isLoading ? (
              <p className="text-sm text-gray-500">Cargando tareas...</p>
            ) : pending.length > 0 ? (
              pending.map((task) => (
                <TaskCard key={`${task.id}-${task.activity}`} task={task} />
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ¡Sin pendientes!
              </p>
            )}
          </div>
        </Card>
        <Card ref={completedRef} className="scroll-mt-24">
          <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-3">
            <CheckCircle2 className="inline-block mr-2" />
            Finalizadas
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {isLoading ? (
              <p className="text-sm text-gray-500">Cargando tareas...</p>
            ) : completed.length > 0 ? (
              completed.map((task) => (
                <TaskCard key={`${task.id}-${task.activity}`} task={task} />
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No hay tareas finalizadas recientemente.
              </p>
            )}
          </div>
        </Card>
      </div>
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
