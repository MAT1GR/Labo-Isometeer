// RUTA: /consultar/src/App.tsx

import React from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Si no hay usuario y no estamos en la página de login, redirige a login
  if (!user && location.pathname !== "/login") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si hay usuario y está intentando acceder a login, redirige al inicio
  if (user && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  // Si es la página de login, no muestra el Layout principal
  if (location.pathname === "/login") {
    return <Outlet />;
  }

  // Para todas las demás rutas, muestra el Layout con el contenido de la ruta anidada
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default App;
