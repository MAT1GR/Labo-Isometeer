// RUTA: consultar/src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";

// --- (importaciones de otras páginas) ---
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Clientes from "./pages/Clientes.tsx";
import ClienteDetail from "./pages/ClienteDetail.tsx";
import ClienteCreate from "./pages/ClienteCreate.tsx";
import OT from "./pages/ot.tsx";
import OTCreate from "./pages/OTCreate.tsx";
import OTdetail from "./pages/OTdetail.tsx";
import Usuarios from "./pages/Usuarios.tsx";
import Perfil from "./pages/Perfil.tsx";
import Contratos from "./pages/Contratos.tsx";
import Actividades from "./pages/Actividades.tsx";
import AdminFavicon from "./pages/AdminFavicon.tsx";
import Facturacion from "./pages/Facturacion.tsx";
import FacturaDetail from "./pages/FacturaDetail.tsx";
import FacturaCreate from "./pages/FacturaCreate.tsx";
import UserChart from "./pages/UserChart.tsx";
import Presupuestos from "./pages/Presupuestos.tsx";
import PresupuestoCreate from "./pages/PresupuestoCreate.tsx";
import PresupuestoDetail from "./pages/PresupuestoDetail.tsx";
import Estadisticas from "./pages/Estadisticas.tsx";
// --- 1. IMPORTA LA NUEVA PÁGINA DE ATAJOS ---
import AtajosDeTeclado from "./pages/AtajosDeTeclado.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { path: "/", element: <Dashboard /> },
      { path: "/clientes", element: <Clientes /> },
      { path: "/clientes/crear", element: <ClienteCreate /> },
      { path: "/clientes/editar/:id", element: <ClienteDetail /> },
      { path: "/clientes/:id", element: <ClienteDetail /> },
      { path: "/ot", element: <OT /> },
      { path: "/ot/crear", element: <OTCreate /> },
      { path: "/ot/editar/:id", element: <OTdetail /> },
      {
        path: "ots/:id",
        element: <OTdetail />,
      },
      { path: "/usuarios", element: <Usuarios /> },
      { path: "/perfil", element: <Perfil /> },
      { path: "/facturacion", element: <Facturacion /> },
      { path: "/facturacion/crear", element: <FacturaCreate /> },
      { path: "/facturacion/:id", element: <FacturaDetail /> },
      { path: "/admin/contratos", element: <Contratos /> },
      { path: "/admin/puntajes", element: <Actividades /> },
      { path: "/admin/favicon", element: <AdminFavicon /> },
      { path: "/presupuestos", element: <Presupuestos /> },
      { path: "/presupuestos/crear", element: <PresupuestoCreate /> },
      { path: "/presupuestos/:id", element: <PresupuestoDetail /> },
      { path: "/presupuestos/editar/:id", element: <PresupuestoDetail /> },
      { path: "/usuarios/grafico", element: <UserChart /> },
      { path: "/estadisticas", element: <Estadisticas /> },

      // --- 2. AGREGA LA NUEVA RUTA PARA LOS ATAJOS ---
      { path: "/atajos", element: <AtajosDeTeclado /> },
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
