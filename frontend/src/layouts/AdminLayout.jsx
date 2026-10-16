import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  Users,
  Shirt,
  ShoppingBag,
  Factory,
  HardHat,
  Wallet,
  BarChart3,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['vendedor', 'administrador', 'superusuario'] },
    { label: 'Clientes', path: '/clientes', icon: Users, roles: ['vendedor', 'administrador', 'superusuario'] },
    { label: 'Catálogo & Prendas', path: '/catalogo', icon: Shirt, roles: ['administrador', 'superusuario'] },
    { label: 'Ventas & Pedidos', path: '/pedidos', icon: ShoppingBag, roles: ['vendedor', 'administrador', 'superusuario'] },
    { label: 'Producción & QR', path: '/produccion', icon: Factory, roles: ['vendedor', 'administrador', 'superusuario'] },
    { label: 'Trabajadores', path: '/trabajadores', icon: HardHat, roles: ['administrador', 'superusuario'] },
    { label: 'Tesorería & Créditos', path: '/tesoreria', icon: Wallet, roles: ['vendedor', 'administrador', 'superusuario'] },
    { label: 'Reportes & KPIs', path: '/reportes', icon: BarChart3, roles: ['administrador', 'superusuario'] },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (user?.rol === 'superusuario') return true;
    return item.roles.includes(user?.rol);
  });

  const getRoleBadge = (rol) => {
    switch (rol) {
      case 'superusuario':
        return <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-200">Superusuario</span>;
      case 'administrador':
        return <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">Administrador</span>;
      case 'vendedor':
        return <span className="bg-amber-100 text-amber-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-amber-200">Vendedor</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">{rol}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
            🧵
          </div>
          <span className="font-bold text-gray-900 tracking-tight text-lg">TEXTIL-APP</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-72 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles size={20} className="text-amber-300" />
          </div>
          <div>
            <h1 className="font-extrabold text-gray-900 tracking-tight text-lg leading-tight">TEXTIL-APP</h1>
            <p className="text-xs text-gray-400 font-medium">Gestión & Trazabilidad Textil</p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 bg-gray-50 border border-gray-200/80 rounded-xl flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Conectado como</span>
            {getRoleBadge(user?.rol)}
          </div>
          <p className="text-sm font-bold text-gray-800 truncate">{user?.nombre}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-white' : 'text-gray-500'} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight size={16} className="text-blue-200" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          {user?.rol === 'trabajador' && (
            <Link
              to="/portal-trabajador"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
            >
              <HardHat size={18} />
              <span>Ir a mi Portal Operario</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
