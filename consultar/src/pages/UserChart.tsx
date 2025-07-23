// RUTA: /cliente/src/pages/UserChart.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api/axiosInstance";
import { User } from "../services/auth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { ArrowLeft } from "lucide-react";

const UserChart: React.FC = () => {
  const { data: users, error, isLoading } = useSWR<User[]>("/users", fetcher);
  const navigate = useNavigate();

  if (error) return <div>Error al cargar los datos.</div>;
  if (isLoading) return <div>Cargando gráfico...</div>;

  // Filtramos para mostrar solo empleados en el gráfico de puntos
  const employeeData = users?.filter((user) => user.role === "empleado");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gráfico de Puntos por Usuario</h1>
        <Button variant="outline" onClick={() => navigate("/usuarios")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la Lista
        </Button>
      </div>
      <Card>
        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <BarChart
              data={employeeData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip
                cursor={{ fill: "rgba(200,200,200,0.1)" }}
                contentStyle={{
                  backgroundColor: "rgba(30,41,59,0.9)",
                  border: "none",
                  borderRadius: "0.5rem",
                }}
                labelStyle={{ color: "#cbd5e1" }}
              />
              <Legend />
              <Bar dataKey="points" name="Puntos Acumulados" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default UserChart;
