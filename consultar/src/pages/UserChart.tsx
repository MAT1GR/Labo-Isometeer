// RUTA: /cliente/src/pages/UserChart.tsx

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api/axiosInstance";
import { User } from "../services/auth";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import {
  ArrowLeft,
  Award,
  Briefcase,
  CheckCircle,
  Activity,
  Users,
} from "lucide-react";
import { formatDate } from "../lib/utils";
import UserSelect from "../components/ui/UserSelect";
import DateRangeFilter from "../components/ui/DateRangeFilter"; // Importa el nuevo componente
import { subMonths, endOfDay, formatISO } from "date-fns";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#6366f1",
  "#ef4444",
];

const UserStatsPanel = ({
  userId,
  dateRange,
}: {
  userId: string;
  dateRange: { startDate: string; endDate: string };
}) => {
  // Construye la URL con los parámetros de fecha
  const statsUrl = userId
    ? `/statistics/user/${userId}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
    : null;

  const {
    data: statsData,
    error: statsError,
    isLoading: statsLoading,
  } = useSWR(statsUrl, fetcher);
  const navigate = useNavigate();

  if (statsLoading) return <div className="text-center py-8">Cargando...</div>;
  if (statsError || !statsData)
    return (
      <div className="text-center py-8 text-red-500">
        No se pudieron cargar los datos.
      </div>
    );

  // ... (el resto del componente UserStatsPanel se mantiene igual)
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-4">
          <Award className="h-8 w-8 text-yellow-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Puntos Totales
            </p>
            <p className="text-2xl font-bold">
              {statsData.stats.totalPoints || 0}
            </p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-4">
          <Briefcase className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              OTs Finalizadas
            </p>
            <p className="text-2xl font-bold">
              {statsData.stats.totalOTsFinalizadas || 0}
            </p>
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-center gap-4">
          <CheckCircle className="h-8 w-8 text-blue-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Actividades Completadas
            </p>
            <p className="text-2xl font-bold">
              {statsData.stats.totalCompletedActivities || 0}
            </p>
          </div>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Activity /> Distribución de Actividades
        </h2>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={statsData.activityDistribution}
                dataKey="count"
                nameKey="activity"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {statsData.activityDistribution.map(
                  (entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  )
                )}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Briefcase /> OTs Recientes
        </h2>
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {statsData.completedWorkOrders.map((ot: any) => (
                <tr
                  key={ot.ot_id + ot.activity}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => navigate(`/ot/editar/${ot.ot_id}`)}
                >
                  <td className="px-4 py-3 font-medium">{ot.custom_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {ot.activity}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">
                    {formatDate(ot.completed_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const UserChart: React.FC = () => {
  const { data: users, error: usersError } = useSWR<User[]>("/users", fetcher);
  const navigate = useNavigate();
  const [compareMode, setCompareMode] = useState(false);
  const [user1Id, setUser1Id] = useState<string>("");
  const [user2Id, setUser2Id] = useState<string>("");

  // Estado para el rango de fechas
  const [dateRange, setDateRange] = useState({
    startDate: formatISO(subMonths(new Date(), 1)), // Por defecto, el último mes
    endDate: formatISO(endOfDay(new Date())),
  });

  const handleFilterChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  const user1Url = user1Id
    ? `/statistics/user/${user1Id}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
    : null;
  const user2Url = user2Id
    ? `/statistics/user/${user2Id}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
    : null;

  const { data: user1Data } = useSWR(user1Url, fetcher);
  const { data: user2Data } = useSWR(user2Url, fetcher);

  const comparisonData = useMemo(() => {
    if (!user1Data && !user2Data) return [];

    const data = [
      {
        name: "Puntos",
        [user1Data?.user.name || "Usuario 1"]:
          user1Data?.stats.totalPoints || 0,
        [user2Data?.user.name || "Usuario 2"]:
          user2Data?.stats.totalPoints || 0,
      },
      {
        name: "OTs Finalizadas",
        [user1Data?.user.name || "Usuario 1"]:
          user1Data?.stats.totalOTsFinalizadas || 0,
        [user2Data?.user.name || "Usuario 2"]:
          user2Data?.stats.totalOTsFinalizadas || 0,
      },
      {
        name: "Actividades",
        [user1Data?.user.name || "Usuario 1"]:
          user1Data?.stats.totalCompletedActivities || 0,
        [user2Data?.user.name || "Usuario 2"]:
          user2Data?.stats.totalCompletedActivities || 0,
      },
    ];
    return data;
  }, [user1Data, user2Data]);

  if (usersError) return <div>Error al cargar los usuarios.</div>;

  const employeeUsers = users?.filter((u) => u.role === "empleado") || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Estadísticas de Usuario</h1>
        <Button variant="outline" onClick={() => navigate("/usuarios")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la Lista
        </Button>
      </div>

      {/* Agrega el componente de filtro de fecha aquí */}
      <DateRangeFilter onFilterChange={handleFilterChange} />

      <Card>
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-grow w-full">
            <UserSelect
              users={employeeUsers}
              selectedUserId={user1Id}
              onChange={setUser1Id}
              label={compareMode ? "Usuario 1" : "Seleccionar Empleado"}
            />
          </div>
          {compareMode && (
            <div className="flex-grow w-full">
              <UserSelect
                users={employeeUsers.filter((u) => u.id !== Number(user1Id))}
                selectedUserId={user2Id}
                onChange={setUser2Id}
                label="Usuario 2"
              />
            </div>
          )}
          <div className="flex-shrink-0 w-full md:w-auto">
            <Button
              variant="secondary"
              onClick={() => setCompareMode(!compareMode)}
              className="w-full"
            >
              <Users className="mr-2 h-4 w-4" />
              {compareMode ? "Vista Individual" : "Comparar Usuarios"}
            </Button>
          </div>
        </div>
      </Card>

      {compareMode
        ? (user1Id || user2Id) && (
            <>
              {user1Id && user2Id && (
                <Card>
                  <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                    <Users /> Comparación General
                  </h2>
                  <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={comparisonData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {user1Data && (
                          <Bar dataKey={user1Data.user.name} fill="#3b82f6" />
                        )}
                        {user2Data && (
                          <Bar dataKey={user2Data.user.name} fill="#10b981" />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user1Id && (
                  <UserStatsPanel userId={user1Id} dateRange={dateRange} />
                )}
                {user2Id && (
                  <UserStatsPanel userId={user2Id} dateRange={dateRange} />
                )}
              </div>
            </>
          )
        : user1Id && <UserStatsPanel userId={user1Id} dateRange={dateRange} />}
    </div>
  );
};

export default UserChart;
