// RUTA: /cliente/src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, authService } from "../services/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  canAuthorizeOT: () => boolean;
  canCreateContent: () => boolean;
  canViewAdminContent: () => boolean;
  canManageUsers: () => boolean;
  canManageContracts: () => boolean;
  canManageAdminPanel: () => boolean; // Nueva función
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
    const storedUser = localStorage.getItem("lab_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const loggedInUser = await authService.login({ email, password });
    setUser(loggedInUser);
    localStorage.setItem("lab_user", JSON.stringify(loggedInUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("lab_user");
  };

  const canViewAdminContent = () => {
    return (
      user?.role === "director" ||
      user?.role === "administrador" ||
      user?.role === "administracion"
    );
  };

  const canCreateContent = () => {
    return user?.role !== "empleado";
  };

  const canAuthorizeOT = () => {
    return user?.role === "director" || user?.role === "administrador";
  };

  const canManageUsers = () => {
    return user?.role === "administrador";
  };

  const canManageContracts = () => {
    return user?.role === "administrador";
  };

  const canManageAdminPanel = () => {
    return user?.role === "administrador";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        canAuthorizeOT,
        canCreateContent,
        canViewAdminContent,
        canManageUsers,
        canManageContracts,
        canManageAdminPanel, // Añadimos la función al contexto
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
