// servidor/src/types/express.d.ts

declare namespace Express {
  interface Request {
    user?: {
      id: number;
      role: "empleado" | "director" | "administracion" | "administrador";
    };
  }
}