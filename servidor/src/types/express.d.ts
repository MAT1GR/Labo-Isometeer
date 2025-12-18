// servidor/src/types/express.d.ts
import { User } from "../services/auth"; // Assuming User interface is defined here or similar path

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: "empleado" | "director" | "administracion" | "administrador";
      };
    }
  }
}
