import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layouts & Protected Routes
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import TrabajadorLayout from './layouts/TrabajadorLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Catalogo from './pages/Catalogo';
import Pedidos from './pages/Pedidos';
import Produccion from './pages/Produccion';
import Trabajadores from './pages/Trabajadores';
import Tesoreria from './pages/Tesoreria';
import Reportes from './pages/Reportes';
import PortalTrabajador from './pages/PortalTrabajador';
import NotFound from './pages/NotFound';

// Componente placeholder para módulos de las próximas semanas
function PlaceholderModule({ title, week, desc, icon }) {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
          {icon || '📦'}
        </div>
        <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold">
          Semana {week} del Roadmap
        </span>
        <h2 className="text-2xl font-bold text-gray-900 mt-3">{title}</h2>
        <p className="text-gray-500 text-sm mt-2">{desc}</p>
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs text-left space-y-1.5">
          <p className="font-semibold text-gray-700">Entregables previstos para este módulo:</p>
          <p className="text-gray-500">• Modelos de datos y endpoints con validación Pydantic</p>
          <p className="text-gray-500">• Vistas responsivas en React con Tailwind</p>
          <p className="text-gray-500">• Integración completa con reglas de negocio del sistema</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { fetchCurrentUser, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentUser();
    }
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />

        {/* Redirección Raíz */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />

        {/* Portal del Trabajador (Aislado) */}
        <Route
          path="/portal-trabajador"
          element={
            <ProtectedRoute allowedRoles={['trabajador', 'superusuario']}>
              <TrabajadorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PortalTrabajador />} />
        </Route>

        {/* Panel Administrativo (Vendedor, Administrador, Superusuario) */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['vendedor', 'administrador', 'superusuario']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/produccion" element={<Produccion />} />
          <Route path="/trabajadores" element={<Trabajadores />} />
          <Route path="/tesoreria" element={<Tesoreria />} />
          <Route
            path="/reportes"
            element={
              <PlaceholderModule
                title="Reportes & Rentabilidad"
                week="9"
                desc="KPIs de producción, rendimiento por operario, rentabilidad por pedido y morosidad."
                icon="📊"
              />
            }
          />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
