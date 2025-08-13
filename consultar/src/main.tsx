// RUTA: /consultar/src/main.tsx

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";

// Importamos las páginas para definir las rutas
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import OT from "./pages/ot.tsx";
import OTCreate from "./pages/OTCreate.tsx";
import OTDetail from "./pages/OTdetail.tsx";
import Clientes from "./pages/Clientes.tsx";
import ClienteCreate from "./pages/ClienteCreate.tsx";
import ClienteDetail from "./pages/ClienteDetail.tsx";
import Contratos from "./pages/Contratos.tsx";
import Usuarios from "./pages/Usuarios.tsx";
import Perfil from "./pages/Perfil.tsx";
import AdminPuntajes from "./pages/Actividades.tsx";
import AdminFavicon from "./pages/AdminFavicon.tsx";
import UserChart from "./pages/UserChart.tsx";
import FacturacionPage from "./pages/Facturacion.tsx"; // --- AÑADIR ESTA LÍNEA ---
import FacturaDetail from "./pages/FacturaDetail.tsx";
import FacturaCreate from "./pages/FacturaCreate.tsx";

// Creamos el enrutador con la nueva API
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // App ahora actúa como el Layout principal
    children: [
      { path: "login", element: <Login /> },
      { path: "/", element: <Dashboard /> },
      { path: "ot", element: <OT /> },
      { path: "ot/crear", element: <OTCreate /> },
      { path: "ot/editar/:id", element: <OTDetail /> },
      { path: "facturacion", element: <FacturacionPage /> },
      { path: "facturacion/:id", element: <FacturaDetail /> },
      { path: "facturacion/crear", element: <FacturaCreate /> },
      { path: "clientes", element: <Clientes /> },
      { path: "clientes/crear", element: <ClienteCreate /> },
      { path: "clientes/editar/:id", element: <ClienteDetail /> },
      { path: "perfil", element: <Perfil /> },
      { path: "usuarios", element: <Usuarios /> },
      { path: "usuarios/grafico", element: <UserChart /> },
      { path: "admin/contratos", element: <Contratos /> },
      { path: "admin/puntajes", element: <AdminPuntajes /> },
      { path: "admin/favicon", element: <AdminFavicon /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        {/* Usamos RouterProvider para entregar el enrutador a la app */}
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
