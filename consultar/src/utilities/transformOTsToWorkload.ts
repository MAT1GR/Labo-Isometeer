import { WorkOrder } from "../services/otService";
import { typeWorkloadUser } from "../types/typeWorkloadUser";
import getStateOtTypescript from "./getStateOt/getStateOtTypescript";

function normalizeName(name: string) {
  return name
    .normalize("NFD") // elimina acentos/tildes
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
function normalizeName2(name: string) {
  try {
    return name
      .normalize("NFD") // elimina acentos/tildes
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  } catch (error) {
    return "";
  }
}

function transformOTsToWorkload(ots: WorkOrder[]): typeWorkloadUser[] {
  const workloadMap: Record<string, any> = {};

  ots.forEach((ot) => {
    console.log("OT object keys:", Object.keys(ot));
    const stateOT = getStateOtTypescript({
      Auth: ot.authorized ? 1 : 0, // Assuming authorized is boolean
      activities: ot.activities,
    });
    if (ot.activities && Array.isArray(ot.activities)) {
      ot.activities.forEach((act: any) => {
        let users: string[] = act.users || [];

        if (users && Array.isArray(users)) {
          users.forEach((user) => {
            const normalized = normalizeName(user);

            if (!workloadMap[user]) {
              workloadMap[user] = {
                id: normalized,
                name: user,
                assignedOTs: 0,
                activeOTs: 0,
                completedThisWeek: 0,
                workloadPercentage: 0,
                currentOTs: [],
                ots_pendientes: 0,
                ots_en_progreso: 0,
                ots_finalizadas: 0,
              };
            }

            workloadMap[user].assignedOTs += 1;

            const normalizedState = normalizeName2(act.state);
            if (normalizedState === "created") {
              workloadMap[user].ots_pendientes += 1;
            } else if (normalizedState === "started") {
              workloadMap[user].ots_en_progreso += 1;
            } else if (normalizedState === "end") {
              workloadMap[user].ots_finalizadas += 1;
            }

            if (stateOT === "Terminadas") {
              workloadMap[user].completedThisWeek += 1;
            }

            if (
              normalizedState === "created" ||
              normalizedState === "started"
            ) {
              workloadMap[user].activeOTs += 1;
              workloadMap[user].currentOTs.push({
                id: ot.id,
                type: ot.title,
                otKey: ot.custom_id,
                status: act.state,
              });
            }
          });
        }
      });
    }
  });

  Object.values(workloadMap).forEach((user: any) => {
    if (user.assignedOTs > 0) {
      user.workloadPercentage = Math.min(
        100,
        Math.round((user.activeOTs / 10) * 100)
      );
    }
  });

  return Object.values(workloadMap);
}
export default transformOTsToWorkload;
