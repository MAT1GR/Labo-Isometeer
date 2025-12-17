export type ActivityStateType = "CREATED" | "END" | "STARTED";
export type ActivityType = {
  id: number;
  name: string;
  score: number;
  time: number;
  users: string[]; // ya parseado de "[\"...\"]"
  state: ActivityStateType;
};

export type ChangeType = {
  userId?: number;
  userName?: string;
  ChangeDescription: string;
  date: number;
  comment: string;
};

export type ContactType = {
  type: string;
  contact: string;
  email: string;
  cell: string;
};

export type DescriptionItemType = {
  item: string;
  Description: string;
  import: string; // ojo: viene como string, si lo usás numérico conviene parsearlo
};


export type OT = {
  Activities: ActivityType[];
  Auth: -1 | 0 | 1;
  Availability: string | null;
  Changes: ChangeType[];
  Client: string;
  Contact: ContactType[];
  Cotizacion: string;
  Date: Date; // timestamp en string "1756350000000"
  Description: DescriptionItemType[];
  Factura: string[];
  Facturas: any[]; // Adjust this type based on your factType definition
  FechaEstimada: Date; // formato ISO
  FechaVencimiento: Date | null;
  IdClient: string;
  Marca: string;
  Modelo: string;
  NormaAplicar: string | null;
  OTKey: string;
  Observations: string;
  Producto: string;
  StateProcess: string;
  Type: string;
  contractName: number;
  id: number;
  isClose: number; // parece ser flag (0/1)
  nLacre: string;
  priority: string | null;
};

export type statusOtType = {
  status:
    | "Anulado"
    | "Sin Autorizar"
    | "Sin Asignar"
    | "En Espera"
    | "En Proceso"
    | "Terminadas";
};
