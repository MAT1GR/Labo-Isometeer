// RUTA: /cliente/src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, authService } from "../services/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isDirectorOrAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Revisa si hay un usuario guardado en el almacenamiento local al cargar la app
    const storedUser = localStorage.getItem("lab_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const loggedInUser = await authService.login({ email, password });
      if (loggedInUser) {
        setUser(loggedInUser);
        localStorage.setItem("lab_user", JSON.stringify(loggedInUser));
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("lab_user");
  };

  const isAdmin = () => {
    return user?.role === "administrador";
  };

  const isDirectorOrAdmin = () => {
    return user?.role === "director" || user?.role === "administrador";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin,
        isDirectorOrAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
