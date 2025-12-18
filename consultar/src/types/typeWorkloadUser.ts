export type typeWorkloadUser = {
  name:string,
  role:string,
  workloadPercentage:number,
  completedThisWeek:number,
  assignedOTs:number,
  activeOTs:number,
  currentOTs:currentOTs[],
  ots_pendientes: number,
  ots_en_progreso: number,
  ots_finalizadas: number,
}

type currentOTs= {
  id:number,
  otKey:string,
  status:string,
  type:string
}
