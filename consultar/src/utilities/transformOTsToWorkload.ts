import { OT } from "../types/typeOT";
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

function transformOTsToWorkload(ots: OT[]): typeWorkloadUser[] {
  const workloadMap: Record<string, any> = {};

  ots.forEach((ot) => {
    const stateOT = getStateOtTypescript({
      Auth: ot.Auth,
      activities: ot.Activities,
    });
    let activities = [];
    try {
      activities = ot.Activities;
    } catch (e) {
      return;
    }
    activities.forEach((act: any) => {
      let users: string[] = [];
      try {
        users = act.users;
      } catch (e) {
        return;
      }

      users.forEach((user) => {
        const normalized = normalizeName(user);

        if (!workloadMap[user]) {
          workloadMap[user] = {
            id: normalized,
            name: user, // acá podrías mapear a nombre real si tenés otro diccionario
            assignedOTs: 0,
            activeOTs: 0,
            completedThisWeek: 0, // necesitarías comparar fechas para calcular esto
            workloadPercentage: 0, // después lo podés calcular con tus reglas
            currentOTs: [],
          };
        }

        // Contamos las OTs asignadas
        workloadMap[user].assignedOTs += 1;
        // Si la actividad no está terminada, la contamos como activa
        if (stateOT === "Terminadas") {
          workloadMap[user].completedThisWeek += 1;
        }
        // Solo agregamos la OT a currentOTs si la actividad está en "Created"
        if (
          normalizeName2(act.state) === "created" ||
          normalizeName2(act.state) === "started"
        ) {
          workloadMap[user].activeOTs += 1;
          workloadMap[user].currentOTs.push({
            id: ot.id,
            type: ot.Type,
            otKey: ot.OTKey,
            status: act.state,
          });
        }

        // Agregamos la OT actual al listado
      });
    });
  });

  // Calcular workloadPercentage (ejemplo simple)
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
