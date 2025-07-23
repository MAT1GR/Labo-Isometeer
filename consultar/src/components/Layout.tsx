// RUTA: /cliente/src/components/Layout.tsx

import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Home,
  Users,
  Briefcase,
  FileText,
  LogOut,
  Menu,
  X,
  FlaskConical,
} from "lucide-react";
import ThemeToggle from "./ui/ThemeToggle"; // Importamos el botón

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    {
      icon: Home,
      label: "Dashboard",
      path: "/",
      roles: ["director", "administrador"],
    },
    {
      icon: Briefcase,
      label: "Órdenes de Trabajo",
      path: "/ot",
      roles: ["empleado", "director", "administrador"],
    },
    {
      icon: Users,
      label: "Clientes",
      path: "/clientes",
      roles: ["director", "administrador"],
    },
    {
      icon: FileText,
      label: "Usuarios",
      path: "/usuarios",
      roles: ["administrador"],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || "")
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 px-6 pb-4 shadow-sm border-r border-gray-200 dark:border-gray-700">
          <div className="flex h-16 shrink-0 items-center gap-3">
            <FlaskConical className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-blue-600 dark:text-blue-500">
                Lab Consultar
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Sistema de Gestión
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-gray-700/50 rounded-lg p-3 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                {user?.role}
              </p>
            </div>
            {/* AQUÍ ESTÁ EL BOTÓN */}
            <ThemeToggle />
          </div>

          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul className="-mx-2 space-y-1">
                  {filteredMenuItems.map((item) => (
                    <li key={item.path}>
                      <button
                        onClick={() => navigate(item.path)}
                        className={`group flex w-full gap-x-3 rounded-md p-3 text-left text-base font-medium leading-6 transition-colors ${
                          isActivePath(item.path)
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-white"
                            : "text-gray-700 hover:bg-gray-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                        }`}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <button
                  onClick={handleLogout}
                  className="group flex w-full gap-x-3 rounded-md p-3 text-left text-base font-medium leading-6 text-gray-700 hover:bg-gray-50 hover:text-red-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-red-500"
                >
                  <LogOut className="h-6 w-6 shrink-0" />
                  Cerrar Sesión
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
