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
  ClipboardListIcon,
  BarChart3,
  Keyboard,
  ChevronLeft,
} from "lucide-react";
import ThemeToggle from "./ui/ThemeToggle";
import { cn } from "../lib/utils";
import Notifications from "./ui/Notifications";
import { useHotkeys } from "react-hotkeys-hook";
import { getShortcuts } from "../config/shortcuts";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "./ui/button";
import clsx from "clsx";

interface SidebarNavigationProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ isCollapsed, toggleSidebar }) => {
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
      icon: ClipboardListIcon,
      label: "Presupuestos",
      path: "/presupuestos",
      roles: ["administracion", "administrador", "director"],
    },
    {
      icon: Receipt,
      label: "Facturación",
      path: "/facturacion",
      roles: ["administracion", "administrador", "director"],
    },
    {
      icon: BarChart3,
      label: "Estadísticas",
      path: "/estadisticas",
      roles: ["administrador", "director"],
    },
    {
      icon: Keyboard,
      label: "Atajos de Teclado",
      path: "/atajos",
      roles: ["director", "administracion", "administrador"],
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
    <div className={clsx("flex grow flex-col gap-y-5 bg-background pb-4 shadow-sm border-r border-border transition-all duration-300 relative",
      isCollapsed ? "px-2" : "px-6"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className={clsx("absolute top-3 right-[-1.25rem] z-50 p-2.5 text-foreground bg-background rounded-full shadow-md border border-border hidden lg:block", isCollapsed && "rotate-180")}
        onClick={toggleSidebar}
      >
        <ChevronLeft className={clsx("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
      </Button>

      <div className={clsx("flex h-16 shrink-0 items-center gap-3", isCollapsed && "justify-center")}>
        <img className="h-8 w-auto" src="/logo.png" alt="Logo de ISOMeter Go" />
        <div className={clsx(isCollapsed && "hidden")}>
          <h1 className="text-lg font-bold text-primary">
            ISOMeter Go
          </h1>
          <p className="text-xs text-muted-foreground">
            Sistema de gestión interno
          </p>
        </div>
      </div>

      <div className={clsx("bg-muted rounded-lg p-3 flex justify-between items-center", isCollapsed && "p-2")}>
        <div className={clsx(isCollapsed && "hidden")}>
          <p className="text-sm font-medium text-foreground">
            {user?.name}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {user?.role}
          </p>
        </div>
        <div className={clsx("flex items-center", isCollapsed ? "flex-col gap-y-2" : "gap-x-1")}>
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
                  <Button
                    variant={(item.path === "/" ? isHomeActive : isActivePath(item.path)) ? "secondary" : "ghost"}
                    className={clsx("w-full gap-x-3 p-3 h-auto text-base",
                      isCollapsed ? "justify-center" : "justify-start"
                    )}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="h-6 w-6 shrink-0" />
                    <span className={clsx(isCollapsed && "hidden")}>{item.label}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </li>

          {canManageAdminPanel() && (
            <li>
              <div className={clsx("text-xs font-semibold leading-6 text-muted-foreground", isCollapsed && "text-center")}>
                Admin
              </div>
              <ul className="mt-2 space-y-1">
                {adminMenuItems.map((item) => (
                  <li key={item.path}>
                    <Button
                      variant={isActivePath(item.path) ? "secondary" : "ghost"}
                      className={clsx("w-full gap-x-3 p-3 h-auto text-base",
                        isCollapsed ? "justify-center" : "justify-start"
                      )}
                      onClick={() => navigate(item.path)}
                    >
                      <item.icon className="h-6 w-6 shrink-0" />
                      <span className={clsx(isCollapsed && "hidden")}>{item.label}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </li>
          )}

          <li className="mt-auto space-y-1">
            <Button
              variant={isActivePath("/perfil") ? "secondary" : "ghost"}
              className={clsx("w-full gap-x-3 p-3 h-auto text-base",
                isCollapsed ? "justify-center" : "justify-start"
              )}
              onClick={() => navigate("/perfil")}
            >
              <UserCircle className="h-6 w-6 shrink-0" />
              <span className={clsx(isCollapsed && "hidden")}>Perfil</span>
            </Button>
            <Button
              variant="ghost"
              className={clsx("w-full gap-x-3 p-3 h-auto text-base text-destructive hover:bg-destructive/10 hover:text-destructive",
                isCollapsed ? "justify-center" : "justify-start"
              )}
              onClick={handleLogout}
            >
              <LogOut className="h-6 w-6 shrink-0" />
              <span className={clsx(isCollapsed && "hidden")}>Cerrar Sesión</span>
            </Button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const { canCreateContent } = useAuth(); 

  const [shortcuts] = useState(getShortcuts());

  useHotkeys(
    shortcuts.CREATE_NEW_OT.keys,
    () => {
      if (canCreateContent()) {
        navigate("/ot/crear");
      }
    },
    { preventDefault: true },
    [navigate, shortcuts, canCreateContent]
  );

  useHotkeys(
    shortcuts.GO_TO_DASHBOARD.keys,
    () => navigate("/"),
    { preventDefault: true },
    [navigate, shortcuts]
  );
  useHotkeys(
    shortcuts.GO_TO_OTS.keys,
    () => navigate("/ot"),
    { preventDefault: true },
    [navigate, shortcuts]
  );
  useHotkeys(
    shortcuts.GO_TO_CLIENTS.keys,
    () => navigate("/clientes"),
    { preventDefault: true },
    [navigate, shortcuts]
  );
  useHotkeys(
    shortcuts.TOGGLE_THEME.keys,
    toggleTheme,
    { preventDefault: true },
    [toggleTheme, shortcuts]
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setSidebarOpen}
        >
          {/* ... (mobile sidebar dialog) ... */}
        </Dialog>
      </Transition.Root>

      <div className={clsx("hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        <SidebarNavigation isCollapsed={isSidebarCollapsed} toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      </div>

      <div className={clsx("flex flex-1 flex-col",
        isSidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
      )}>
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="-m-2.5 p-2.5 text-foreground lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex-1 text-lg font-semibold leading-6 text-foreground">
            {location.pathname.split('/').pop() || 'Dashboard'}
          </div>
        </div>

        <main className="flex-1 h-full">
          <div
            key={location.pathname}
            className="px-4 sm:px-6 lg:px-8 animate-fade-in h-full flex flex-col"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

