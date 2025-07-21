import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Home, 
  Users, 
  Briefcase, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  FlaskConical,
  Bell
} from 'lucide-react'

const Layout: React.FC = () => {
  const { user, logout, isAdmin, isDirectorOrAdmin } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/', roles: ['director', 'administrador'] },
    { icon: Briefcase, label: 'Órdenes de Trabajo', path: '/ot', roles: ['empleado', 'director', 'administrador'] },
    { icon: Users, label: 'Clientes', path: '/clientes', roles: ['director', 'administrador'] },
    { icon: FileText, label: 'Usuarios', path: '/usuarios', roles: ['administrador'] },
  ]

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || '')
  )

  const handleLogout = async () => {
    logout()
    navigate('/login')
  }

  const isActivePath = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-sm">
          <div className="flex h-16 shrink-0 items-center gap-3">
            <FlaskConical className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-lg font-bold text-blue-600">Lab Consultar</h1>
              <p className="text-xs text-gray-500">Sistema de Gestión</p>
            </div>
          </div>
          
          {/* User Info */}
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
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
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-blue-700'
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
                  className="group flex w-full gap-x-3 rounded-md p-3 text-left text-base font-medium leading-6 text-gray-700 hover:bg-gray-50 hover:text-red-700"
                >
                  <LogOut className="h-6 w-6 shrink-0" />
                  Cerrar Sesión
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-bold text-blue-600">Lab Consultar</h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-6 w-6 text-blue-600" />
                  <h1 className="text-lg font-bold text-blue-600">Lab Consultar</h1>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mt-6 bg-blue-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-600 capitalize">{user?.role}</p>
              </div>

              <nav className="mt-6">
                <ul className="space-y-1">
                  {filteredMenuItems.map((item) => (
                    <li key={item.path}>
                      <button
                        onClick={() => {
                          navigate(item.path)
                          setMobileMenuOpen(false)
                        }}
                        className={`group flex w-full gap-x-3 rounded-md p-3 text-left text-base font-medium leading-6 transition-colors ${
                          isActivePath(item.path)
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-blue-700'
                        }`}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        {item.label}
                      </button>
                    </li>
                  ))}
                  <li className="mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="group flex w-full gap-x-3 rounded-md p-3 text-left text-base font-medium leading-6 text-gray-700 hover:bg-gray-50 hover:text-red-700"
                    >
                      <LogOut className="h-6 w-6 shrink-0" />
                      Cerrar Sesión
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout