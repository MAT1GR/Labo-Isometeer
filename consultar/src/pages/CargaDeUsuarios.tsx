import React from "react";
import useSWR from "swr";
import { authService, User } from "../services/auth";
import { otService, WorkOrder, Activity } from "../services/otService";
import { useAuth } from "../contexts/AuthContext";
import { useTitle } from "../contexts/TitleContext";

interface UserWorkload {
  user: User;
  totalOTs: number;
  otStatusCounts: Record<string, number>;
  workloadPercentage: number;
}

const UserWorkloadCard: React.FC<{ workload: UserWorkload }> = ({
  workload,
}) => {
  const { user, totalOTs, otStatusCounts, workloadPercentage } = workload;

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 mb-6">
      <h3 className="text-xl font-semibold mb-2 dark:text-white">{user.name}</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{user.email}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 dark:text-gray-300">
        <div>
          <p className="font-semibold dark:text-white">OTs Asignadas:</p>
          <p>{totalOTs} en total</p>
        </div>
        <div>
          <p className="font-semibold dark:text-white">Estado de OTs:</p>
          <ul>
            {Object.entries(otStatusCounts).map(([status, count]) => (
              <li key={status}>
                <span className="capitalize">{status}:</span> {count}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4">
        <p className="font-semibold dark:text-white">Carga de Trabajo:</p>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full"
            style={{ width: `${workloadPercentage}%` }}
          ></div>
        </div>
        <p className="text-right text-sm dark:text-gray-300">{workloadPercentage.toFixed(2)}%</p>
      </div>
    </div>
  );
};

const CargaDeUsuarios: React.FC = () => {
  const { user } = useAuth();
  const { setTitle } = useTitle();

  React.useEffect(() => {
    setTitle("Carga de Usuarios");
  }, [setTitle]);

  const {
    data: users,
    error: usersError,
    isLoading: usersIsLoading,
  } = useSWR(user ? "/users" : null, authService.getAllUsers);

  const {
    data: ots,
    error: otsError,
    isLoading: otsIsLoading,
  } = useSWR(user ? ["/ot", user.id, user.role] : null, () =>
    otService.getAllOTs(user)
  );

  if (usersIsLoading || otsIsLoading) {
    return <div>Cargando...</div>;
  }

  if (usersError || otsError) {
    return <div>Error al cargar los datos.</div>;
  }

  const calculateUserWorkloads = (
    users: User[],
    ots: WorkOrder[]
  ): UserWorkload[] => {
    let maxActiveOTs = 0;

    const userWorkloadData = users.map((currentUser) => {
      const assignedOts = new Set<WorkOrder>();

      // Iterate over all OTs to see if they are related to the current user
      (ots || []).forEach((ot) => {
        // Check if the OT is directly assigned to the user
        if (ot.assigned_to === currentUser.id) {
          assignedOts.add(ot);
        }

        // Check if any activity within the OT is assigned to the user
        if (ot.activities) {
          for (const activity of ot.activities) {
            if (activity.user_id === currentUser.id) {
              assignedOts.add(ot);
              break; // Once the OT is added, no need to check other activities
            }
          }
        }
      });

      const assignedOtsArray = Array.from(assignedOts);
      const activeOTs = assignedOtsArray.filter(
        (ot) => ot.status === "en_progreso" || ot.status === "pendiente"
      );
      
      // Keep track of the max active OTs for percentage calculation
      if (activeOTs.length > maxActiveOTs) {
        maxActiveOTs = activeOTs.length;
      }

      const otStatusCounts = assignedOtsArray.reduce((acc, ot) => {
        const status = ot.status || "desconocido";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        user: currentUser,
        totalOTs: assignedOtsArray.length,
        otStatusCounts,
        activeOTsCount: activeOTs.length,
        workloadPercentage: 0, // Will be calculated in the next step
      };
    });
    
    // Calculate workload percentage and sort users
    return userWorkloadData
      .map((data) => ({
        ...data,
        workloadPercentage:
          maxActiveOTs > 0 ? (data.activeOTsCount / maxActiveOTs) * 100 : 0,
      }))
      .sort((a, b) => b.workloadPercentage - a.workloadPercentage);
  };

  const userWorkloads = users && ots ? calculateUserWorkloads(users, ots) : [];

  if (userWorkloads.length === 0) {
    return <div>No se encontraron datos de carga de usuarios.</div>;
  }

  return (
    <div className="py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userWorkloads.map((workload) => (
          <UserWorkloadCard key={workload.user.id} workload={workload} />
        ))}
      </div>
    </div>
  );
};

export default CargaDeUsuarios;
