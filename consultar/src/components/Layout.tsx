import React, { useState, Fragment } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Dialog, Transition } from "@headlessui/react";
import {
  Home,
  Users,
  Briefcase,
  LogOut,
  Menu,
  X,
  UserCircle,
  FileSignature,
  Award,
  Image,
  Receipt,
  ListChecks,
  ListChecksIcon,
  ClipboardListIcon,
} from "lucide-react";
import ThemeToggle from "./ui/ThemeToggle";
import { cn } from "../lib/utils";
import Notifications from "./ui/Notifications";

const SidebarNavigation: React.FC = () => {
  const { user, logout, canManageAdminPanel } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    {
      icon: Home,
      label: "Dashboard",
      path: "/",
      roles: ["empleado", "director", "administracion", "administrador"],
    },
    {
      icon: Briefcase,
      label: "Órdenes de Trabajo",
      path: "/ot",
      roles: ["empleado", "director", "administracion", "administrador"],
    },
    {
      icon: Users,
      label: "Clientes",
      path: "/clientes",
      roles: ["director", "administracion", "administrador"],
    },
    {
      icon: ClipboardListIcon, // O el ícono que prefieras
      label: "Presupuestos",
      path: "/presupuestos",
      roles: ["administracion", "administrador", "director"],
    },
    {
      icon: Receipt,
      label: "Facturación",
      path: "/facturacion",
      roles: ["administracion", "administrador", "director"], // Rol de director agregado para visualización
    },
  ];

  const adminMenuItems = [
    {
      icon: FileSignature,
      label: "Contratos",
      path: "/admin/contratos",
    },
    {
      icon: Award,
      label: "Actividades",
      path: "/admin/puntajes",
    },
    {
      icon: Image,
      label: "Cambiar Favicon",
      path: "/admin/favicon",
    },
    {
      icon: Users,
      label: "Usuarios",
      path: "/usuarios",
    },
  ];

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role || "")
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActivePath = (path: string) =>
    path !== "/" && location.pathname.startsWith(path);

  const isHomeActive = location.pathname === "/";

  return (
    <div className="flex grow flex-col gap-y-5 bg-white dark:bg-gray-800 px-6 pb-4 shadow-sm border-r border-gray-200 dark:border-gray-700">
      <div className="flex h-16 shrink-0 items-center gap-3">
        <img className="h-8 w-auto" src="/logo.png" alt="Logo de ISOMeter Go" />
        <div>
          <h1 className="text-lg font-bold text-blue-600 dark:text-blue-500">
            ISOMeter Go
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Sistema de gestión interno
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
        <div className="flex items-center gap-x-1">
          <ThemeToggle />
          <Notifications />
        </div>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto">
        <ul className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul className="space-y-1">
              {filteredMenuItems.map((item) => (
                <li key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "group flex w-full items-center gap-x-3 rounded-md p-3 text-base font-medium leading-6 transition-colors",
                      (
                        item.path === "/"
                          ? isHomeActive
                          : isActivePath(item.path)
                      )
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    )}
                  >
                    <item.icon className="h-6 w-6 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>

          {canManageAdminPanel() && (
            <li>
              <div className="text-xs font-semibold leading-6 text-gray-400">
                Panel de Administrador
              </div>
              <ul className="mt-2 space-y-1">
                {adminMenuItems.map((item) => (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "group flex w-full items-center gap-x-3 rounded-md p-3 text-base font-medium leading-6 transition-colors",
                        isActivePath(item.path)
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-white"
                          : "text-gray-700 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          )}

          <li className="mt-auto space-y-1">
            <button
              onClick={() => navigate("/perfil")}
              className={cn(
                "group flex w-full items-center gap-x-3 rounded-md p-3 text-base font-medium leading-6 transition-colors",
                isActivePath("/perfil")
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-white"
                  : "text-gray-700 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
              )}
            >
              <UserCircle className="h-6 w-6 shrink-0" />
              <span>Perfil</span>
            </button>
            <button
              onClick={handleLogout}
              className="group flex w-full items-center gap-x-3 rounded-md p-3 text-base font-medium leading-6 text-gray-700 hover:bg-gray-100 hover:text-red-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-red-500"
            >
              <LogOut className="h-6 w-6 shrink-0" />
              <span>Cerrar Sesión</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation(); // <--- 1. OBTENER LA UBICACIÓN ACTUAL

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setSidebarOpen}
        >
          {/* ... (código del Dialog y Transition sin cambios) ... */}
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>
          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <X className="h-6 w-6 text-white" />
                    </button>
                  </div>
                </Transition.Child>
                <SidebarNavigation />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <SidebarNavigation />
      </div>

      <div className="flex flex-1 flex-col lg:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-300 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 text-lg font-semibold leading-6 text-gray-900 dark:text-white">
            Dashboard
          </div>
        </div>

        <main className="flex-1 py-10">
          {/* --- 2. APLICAR LA ANIMACIÓN AQUÍ --- */}
          {/* Usamos la ruta (pathname) como `key` para forzar la re-renderización y la animación en cada cambio de página */}
          <div
            key={location.pathname}
            className="px-4 sm:px-6 lg:px-8 animate-fade-in"
          >
            <Outlet />{" "}
            {/* Reemplazamos `children` por `Outlet` para que funcione con las rutas anidadas */}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
