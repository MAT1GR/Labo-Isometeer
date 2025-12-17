export type typeWorkloadUser = {
  name:string,
  role:string,
  workloadPercentage:number,
  completedThisWeek:number,
  assignedOTs:number,
  activeOTs:number,
  currentOTs:currentOTs[]
}

type currentOTs= {
  id:number,
  otKey:string,
  status:string,
  type:string
}
