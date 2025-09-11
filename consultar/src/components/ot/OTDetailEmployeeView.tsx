// RUTA: /consultar/src/components/ot/OTDetailEmployeeView.tsx

import React from "react";
import { Activity } from "../../services/otService";
import { formatDateTime } from "../../lib/utils";
import Card from "../ui/Card";
import Button from "../ui/Button";
import {
  ClipboardList,
  Clock,
  CalendarCheck,
  Play,
  StopCircle,
} from "lucide-react";

interface OTDetailEmployeeViewProps {
  myActivities: Activity[];
  isAuthorized: boolean;
  onStartActivity: (activityId: number) => void;
  onStopActivity: (activityId: number) => void;
}

const OTDetailEmployeeView: React.FC<OTDetailEmployeeViewProps> = ({
  myActivities,
  isAuthorized,
  onStartActivity,
  onStopActivity,
}) => {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
          <ClipboardList size={20} /> Mis Tareas en esta OT
        </h2>
        {myActivities.length > 0 ? (
          <div className="space-y-4">
            {myActivities.map((activity) => {
              const statusColor =
                activity.status === "finalizada"
                  ? "border-green-500"
                  : activity.status === "en_progreso"
                  ? "border-blue-500"
                  : "border-yellow-500";
              return (
                <div
                  key={activity.id}
                  className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 ${statusColor} flex flex-col md:flex-row md:items-center justify-between gap-4`}
                >
                  <div className="flex-1">
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-100">
                      {activity.activity}
                    </p>
                    <div className="flex items-center gap-6 text-xs mt-2 text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          Inicio:{" "}
                          <strong>
                            {formatDateTime(activity.started_at) || "N/A"}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4" />
                        <span>
                          Fin:{" "}
                          <strong>
                            {formatDateTime(activity.completed_at) || "N/A"}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                        activity.status === "finalizada"
                          ? "bg-green-100 text-green-800"
                          : activity.status === "en_progreso"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {activity.status?.replace("_", " ")}
                    </span>
                    {isAuthorized && activity.status === "pendiente" && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onStartActivity(activity.id!)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {isAuthorized && activity.status === "en_progreso" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => onStopActivity(activity.id!)}
                      >
                        <StopCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 italic text-center py-4">
            No tienes tareas asignadas en esta OT.
          </p>
        )}
      </div>
    </Card>
  );
};

export default OTDetailEmployeeView;
