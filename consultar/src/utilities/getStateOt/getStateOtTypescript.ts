import { ActivityType } from "../../types/typeOT";

function getStateOtTypescript({
  Auth,
  activities,
}: {
  Auth: 0 | 1 | -1;
  activities: ActivityType[];
}) {
  try {
    if (Auth === -1) return "Anulado";
    if (Auth === 0) return "Sin Autorizar";

    if (activities?.some((activity) => !activity.users[0]))
      return "Sin Asignar";
    if (
      activities?.some((activity) => activity.state.toUpperCase() === "CREATED")
    )
      return "En Espera";
    if (
      activities?.some((activity) => activity.state.toUpperCase() === "STARTED")
    ) 
      return "En Proceso";
    return "Terminadas";
  } catch (error) {
    return "Terminadas";
  }
} 

export default getStateOtTypescript;
