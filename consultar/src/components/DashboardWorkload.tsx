import { useEffect, useState } from "react";
import { Badge } from "./ui/badge";
import { OT } from "../types/typeOT";
import transformOTsToWorkload from "../utilities/transformOTsToWorkload";
import { typeWorkloadUser } from "../types/typeWorkloadUser";
import { useGoToOT } from "../hooks/useGoToOT";
import { ChevronDown, ChevronUp, Eye, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
const LOCAL_STORAGE_KEY = "dashboardUserOrder";

function DashboardWorkload({ ot }: { ot: OT[] }) {
  const [workload, setWorkload] = useState<typeWorkloadUser[]>();
  const [order, setOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const goToOT = useGoToOT();
  const getWorkloadColor = (percentage: number) => {
    if (percentage >= 80) return "bg-red-500";
    if (percentage >= 60) return "bg-amber-500";
    return "bg-emerald-500";
  };
  const getWorkloadTextColor = (percentage: number) => {
    if (percentage >= 80) return "text-red-600";
    if (percentage >= 60) return "text-amber-600";
    return "text-emerald-500";
  };
  useEffect(() => {
    const users = transformOTsToWorkload(ot);
    let sortedUsers = [...users];
    // Si hay un orden guardado, aplicarlo
    if (order.length) {
      sortedUsers.sort((a, b) => {
        const indexA = order.indexOf(a.name);
        const indexB = order.indexOf(b.name);
        // si no está en el array, lo ponemos al final
        if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    } else {
      // si no hay orden guardado, ordenar alfabéticamente
      setOrder(sortedUsers.map((x) => x.name));
      sortedUsers.sort((a, b) => a.name.localeCompare(b.name));
    }

    setWorkload(sortedUsers);
  }, [ot, order]);
  const moveUser = (
    userName: string,
    direction: "up" | "down" | "top" | "bottom"
  ) => {
    const index = order.indexOf(userName);
    if (index === -1) return;

    let newOrder = [...order];

    if (direction === "up" && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [
        newOrder[index],
        newOrder[index - 1],
      ];
    } else if (direction === "down" && index < order.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [
        newOrder[index],
        newOrder[index + 1],
      ];
    } else if (direction === "top") {
      newOrder.splice(index, 1);
      newOrder.unshift(userName);
    } else if (direction === "bottom") {
      newOrder.splice(index, 1);
      newOrder.push(userName);
    }

    setOrder(newOrder);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newOrder));
  };
  return (
    <div className="space-y-4">
      {/* User Workload Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2  gap-4 pb-20">
        {workload &&
          workload.map((user, key) => (
            <div
              key={key}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg transition-shadow hover:shadow-xl duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                {/* IZQUIERDA */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-500">
                      #{order.indexOf(user.name) + 1}
                    </span>
                    <div className="font-semibold text-gray-900">
                      {user.name}
                    </div>
                  </div>
                </div>

                {/* DERECHA */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`transition-colors duration-300 ${
                      user.workloadPercentage >= 80
                        ? "bg-red-100 text-red-600 border-red-200"
                        : user.workloadPercentage >= 60
                        ? "bg-amber-100 text-amber-600 border-amber-200"
                        : "bg-emerald-100 text-emerald-600 border-emerald-200"
                    }`}
                  >
                    {user.workloadPercentage}% Carga
                  </Badge>

                  {/* Menú contextual */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-full hover:bg-muted">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => moveUser(user.name, "up")}
                      >
                        <ChevronUp />
                        Subir
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => moveUser(user.name, "down")}
                      >
                        <ChevronDown />
                        Bajar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => moveUser(user.name, "top")}
                      >
                        <ChevronUp />
                        Ir al inicio
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => moveUser(user.name, "bottom")}
                      >
                        <ChevronDown />
                        Ir al final
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Workload Bar */}
              <div className="mb-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getWorkloadColor(
                      user.workloadPercentage
                    )} transition-all duration-500`}
                    style={{ width: `${user.workloadPercentage}%` }}
                  />
                </div>
                <div
                  className={`h-full w-full text-xs font-semibold	${getWorkloadTextColor(
                    user.workloadPercentage
                  )}`}
                >
                  {user.activeOTs}/10 OT
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {user.assignedOTs}
                  </div>
                  <div className="text-xs text-gray-500">Asignadas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {user.activeOTs}
                  </div>
                  <div className="text-xs text-gray-500">Activas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {user.completedThisWeek}
                  </div>
                  <div className="text-xs text-gray-500">Completadas</div>
                </div>
              </div>

              {/* Current OTs */}
              <div>
                <div className="text-xs text-gray-500 mb-2">OTs Actuales:</div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {user.currentOTs.map((ot, key) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-xs bg-gray-100 rounded px-2 py-1 transition-all duration-300 hover:bg-gray-200 cursor-pointer"
                    >
                      <span className="font-mono text-gray-700">
                        {ot.otKey}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-100 text-blue-600 border-blue-200"
                        >
                          {ot.type}
                        </Badge>
                        <Eye
                          size={16}
                          className="text-gray-600 hover:text-gray-900 transition-colors"
                          onClick={() => goToOT(ot.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default DashboardWorkload;
