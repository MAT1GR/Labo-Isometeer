// RUTA: /cliente/src/pages/Dashboard.tsx

import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Card from "../components/ui/Card";
import { formatCurrency, formatDate } from "../lib/utils";
import {
  FileText,
  Users,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Smile,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axiosInstance from "../api/axiosInstance";

// --- Interfaces ---
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

// --- Vista para Administradores y Directores ---
const AdminDirectorDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await axiosInstance.get("/dashboard/stats");
        setStats(response.data.stats);
        setRecentOrders(response.data.recentOrders);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

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

  const monthlyData = [
    { month: "Ene", revenue: 180000 },
    { month: "Feb", revenue: 220000 },
    { month: "Mar", revenue: 195000 },
    { month: "Abr", revenue: 280000 },
    { month: "May", revenue: 245000 },
    { month: "Jun", revenue: 310000 },
  ];

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  if (!stats) return <p>No se pudieron cargar los datos.</p>;

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
              recentOrders.map((order) => (
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

// --- Vista para Empleados ---
const EmpleadoDashboard: React.FC = () => {
  const { user } = useAuth();
  return (
    // --- CAMBIO AQUÍ: AÑADIMOS CLASES PARA MODO OSCURO ---
    <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
      <Smile className="h-16 w-16 mx-auto text-blue-500" />
      <h1 className="mt-4 text-3xl font-bold text-gray-800 dark:text-gray-100">
        ¡Hola, {user?.name}!
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        Bienvenido al sistema. Desde "Órdenes de Trabajo" puedes ver y gestionar
        tus tareas.
      </p>
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
