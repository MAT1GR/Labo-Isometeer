// RUTA: /cliente/src/App.tsx

import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import UserChart from "./pages/UserChart";
import Clientes from "./pages/Clientes";
import ClienteCreate from "./pages/ClienteCreate";
import ClienteDetail from "./pages/ClienteDetail";
import OT from "./pages/ot";
import OTCreate from "./pages/OTCreate";
import OTDetail from "./pages/OTdetail";
import Perfil from "./pages/Perfil";
import Contratos from "./pages/Contratos";
import AdminPuntajes from "./pages/Actividades";
import AdminFavicon from "./pages/AdminFavicon";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  return user ? <Navigate to="/" /> : <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="ot" element={<OT />} />
            <Route path="ot/crear" element={<OTCreate />} />
            <Route path="ot/editar/:id" element={<OTDetail />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="clientes/crear" element={<ClienteCreate />} />
            <Route path="clientes/editar/:id" element={<ClienteDetail />} />

            <Route path="perfil" element={<Perfil />} />

            {/* Rutas de Admin */}
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="usuarios/grafico" element={<UserChart />} />
            <Route path="admin/contratos" element={<Contratos />} />
            <Route path="admin/puntajes" element={<AdminPuntajes />} />
            <Route path="admin/favicon" element={<AdminFavicon />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
