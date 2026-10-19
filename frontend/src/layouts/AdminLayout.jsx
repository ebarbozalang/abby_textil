import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTasaStore } from '../store/tasaStore';
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
  ChevronRight,
  RefreshCw,
  Edit3,
  Coins,
} from 'lucide-react';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { tasa, fuente, cargarTasa, sincronizarBCV, fijarTasaManual, cargando: tasaCargando } = useTasaStore();

  const [modalTasaOpen, setModalTasaOpen] = useState(false);
  const [nuevaTasaInput, setNuevaTasaInput] = useState('');
  const [motivoTasaInput, setMotivoTasaInput] = useState('');
  const [syncStatus, setSyncStatus] = useState('');

  useEffect(() => {
    cargarTasa();
  }, []);

  const handleSyncBCV = async () => {
    setSyncStatus('Sincronizando con BCV...');
    const res = await sincronizarBCV();
    if (res.success) {
      setSyncStatus(`¡Tasa BCV: Bs. ${parseFloat(res.tasa).toFixed(2)} / $!`);
      setTimeout(() => setSyncStatus(''), 4000);
    } else {
      setSyncStatus('Error al conectar con BCV');
      setTimeout(() => setSyncStatus(''), 4000);
    }
  };

  const handleGuardarManual = async (e) => {
    e.preventDefault();
    if (!nuevaTasaInput || parseFloat(nuevaTasaInput) <= 0) return;
    const res = await fijarTasaManual(nuevaTasaInput, motivoTasaInput || 'Ajuste manual administrativo');
    if (res.success) {
      setModalTasaOpen(false);
      setNuevaTasaInput('');
      setMotivoTasaInput('');
      setSyncStatus(`¡Tasa manual: Bs. ${parseFloat(res.tasa).toFixed(2)} / $!`);
      setTimeout(() => setSyncStatus(''), 4000);
    }
  };

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
        return <span className="bg-abby-100 text-abby-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-abby-200">Superusuario</span>;
      case 'administrador':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-purple-200">Administrador</span>;
      case 'vendedor':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-200">Vendedor</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-xs px-2.5 py-0.5 rounded-full font-semibold">{rol}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="AbbySoft Logo"
            className="w-8 h-8 rounded-full object-contain bg-[#7B0078]"
          />
          <div>
            <span className="font-black text-gray-900 tracking-tight text-lg">
              Abby<span className="text-abby-700">Soft</span>
            </span>
          </div>
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
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative">
            <img
              src="/logo.png"
              alt="AbbySoft Logo"
              className="w-12 h-12 rounded-full object-contain p-0.5 bg-[#7B0078] shadow-md shadow-[#7B0078]/25"
            />
          </div>
          <div>
            <h1 className="font-black text-gray-900 tracking-tight text-xl leading-tight">
              Abby<span className="text-abby-700">Soft</span>
            </h1>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-abby-600">
              Tu Visión, Nuestro Código.
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3.5 mx-3 my-2.5 bg-abby-50/60 border border-abby-100 rounded-xl flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500">Conectado como</span>
            {getRoleBadge(user?.rol)}
          </div>
          <p className="text-sm font-bold text-gray-900 truncate">{user?.nombre}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-1 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-abby-700 to-abby-600 text-white shadow-md shadow-abby-700/25 font-semibold'
                    : 'text-gray-700 hover:bg-abby-50/80 hover:text-abby-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-white' : 'text-gray-500'} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight size={16} className="text-white/80" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          {user?.rol === 'trabajador' && (
            <Link
              to="/portal-trabajador"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-abby-700 hover:bg-abby-50 rounded-xl font-semibold transition-colors"
            >
              <HardHat size={18} />
              <span>Ir a mi Portal Operario</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top App Header with BCV Ticker */}
        <header className="hidden md:flex bg-white border-b border-gray-200 px-6 py-2.5 items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
            <span className="font-bold text-gray-800">Moneda por Defecto:</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md border border-emerald-200">
              USD ($)
            </span>
            <span className="text-gray-300">|</span>
            <span>Moneda Secundaria:</span>
            <span className="px-2 py-0.5 bg-purple-50 text-abby-700 font-bold rounded-md border border-purple-200">
              Bolívares (Bs.)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {syncStatus && (
              <span className="text-xs font-semibold text-emerald-600 animate-pulse">
                {syncStatus}
              </span>
            )}
            {/* Tasa Pill */}
            <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-50 to-amber-50 border border-purple-200 rounded-xl">
              <Coins className="w-4 h-4 text-amber-600" />
              <div className="text-xs">
                <span className="text-gray-500 text-[10px] font-semibold block uppercase">
                  Tasa {fuente.includes('manual') ? 'Manual' : 'BCV Oficial'}
                </span>
                <span className="font-black text-gray-900 text-sm">
                  Bs. {parseFloat(tasa || 45).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} / $
                </span>
              </div>

              <div className="flex items-center gap-1 border-l border-purple-200 pl-2 ml-1">
                <button
                  onClick={handleSyncBCV}
                  disabled={tasaCargando}
                  title="Sincronizar tasa oficial con BCV"
                  className="p-1 text-purple-700 hover:text-purple-900 hover:bg-white rounded-md transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${tasaCargando ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    setNuevaTasaInput(tasa.toFixed(2));
                    setModalTasaOpen(true);
                  }}
                  title="Ajustar tasa manual del negocio"
                  className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1">
          <Outlet />
        </div>

        {/* Modal Tasa Manual */}
        {modalTasaOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-gray-900 text-lg">Ajustar Tasa de Cambio</h3>
                </div>
                <button
                  onClick={() => setModalTasaOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGuardarManual} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Nueva Tasa en Bolívares por Dólar (Bs/$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    placeholder="Ej: 50.50"
                    value={nuevaTasaInput}
                    onChange={(e) => setNuevaTasaInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Motivo o Justificación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Tasa interna de cobro del día"
                    value={motivoTasaInput}
                    onChange={(e) => setMotivoTasaInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-800">
                  💡 Esta tasa se aplicará para convertir los cobros en Bolívares a Dólares y mostrar los precios en Bs.
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setModalTasaOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm"
                  >
                    Guardar Tasa Manual
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
