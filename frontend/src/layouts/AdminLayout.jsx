import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTasaStore } from '../store/tasaStore';
import { useConfiguracionStore } from '../store/configuracionStore';
import {
  LayoutDashboard,
  Users,
  Shirt,
  ShoppingBag,
  Factory,
  HardHat,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  RefreshCw,
  Edit3,
  Coins,
  Moon,
  Sun,
  Building2,
} from 'lucide-react';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { tasa, fuente, cargarTasa, sincronizarBCV, fijarTasaManual, cargando: tasaCargando } = useTasaStore();
  const { config, actualizarCampoLocal, guardarConfiguracion } = useConfiguracionStore();

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

  const handleToggleTheme = () => {
    const nuevo = config.theme_mode === 'dark' ? 'light' : 'dark';
    actualizarCampoLocal('theme_mode', nuevo);
    // Si es admin o superusuario, guardar también de fondo
    if (user?.rol === 'administrador' || user?.rol === 'superusuario') {
      guardarConfiguracion({ ...config, theme_mode: nuevo });
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
    { label: 'Configuración & Empresa', path: '/configuracion', icon: Settings, roles: ['administrador', 'superusuario'] },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (user?.rol === 'superusuario') return true;
    return item.roles.includes(user?.rol);
  });

  const getRoleBadge = (rol) => {
    switch (rol) {
      case 'superusuario':
        return <span className="bg-abby-100 text-abby-800 dark:bg-purple-900/60 dark:text-purple-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-abby-200 dark:border-purple-700">Superusuario</span>;
      case 'administrador':
        return <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-purple-200 dark:border-purple-700">Administrador</span>;
      case 'vendedor':
        return <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-amber-200 dark:border-amber-700">Vendedor</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs px-2.5 py-0.5 rounded-full font-semibold">{rol}</span>;
    }
  };

  const primaryColor = config?.color_primario || '#7B0078';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row transition-colors">
      {/* Mobile Topbar */}
      <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img
            src={config?.logo_url || '/logo.png'}
            alt="Logo Empresa"
            className="w-8 h-8 rounded-full object-contain p-0.5 shadow-sm"
            style={{ backgroundColor: primaryColor }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/logo.png';
            }}
          />
          <div>
            <span className="font-black text-gray-900 dark:text-white tracking-tight text-base truncate max-w-[180px] block">
              {config?.nombre_empresa || 'AbbySoft'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Cambiar tema"
          >
            {config.theme_mode === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-purple-600" />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 h-screen w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-50 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
          <div className="relative">
            <img
              src={config?.logo_url || '/logo.png'}
              alt="Logo"
              className="w-12 h-12 rounded-full object-contain p-0.5 shadow-md"
              style={{ backgroundColor: primaryColor }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/logo.png';
              }}
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-gray-900 dark:text-white tracking-tight text-lg leading-tight truncate">
              {config?.nombre_empresa || 'AbbySoft'}
            </h1>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 truncate">
              {config?.slogan || 'Tu Visión, Nuestro Código.'}
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3.5 mx-3 my-2.5 bg-purple-50/60 dark:bg-gray-800/60 border border-purple-100 dark:border-gray-700/60 rounded-xl flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Conectado como</span>
            {getRoleBadge(user?.rol)}
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.nombre}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
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
                    ? 'text-white shadow-md font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
                style={isActive ? { backgroundColor: primaryColor } : {}}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight size={16} className="text-white/80" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
          {user?.rol === 'trabajador' && (
            <Link
              to="/portal-trabajador"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-gray-800 rounded-xl font-semibold transition-colors"
            >
              <HardHat size={18} />
              <span>Ir a mi Portal Operario</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top App Header with BCV Ticker & Theme Quick Toggle */}
        <header className="hidden md:flex bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-2.5 items-center justify-between sticky top-0 z-30 shadow-xs transition-colors">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span className="font-bold text-gray-800 dark:text-gray-200">Moneda por Defecto:</span>
            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold rounded-md border border-emerald-200 dark:border-emerald-800">
              USD ($)
            </span>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span>Moneda Secundaria:</span>
            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold rounded-md border border-purple-200 dark:border-purple-800">
              Bolívares (Bs.)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {syncStatus && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse">
                {syncStatus}
              </span>
            )}

            {/* Selector Rápido de Tema (Dark / Light) */}
            <button
              onClick={handleToggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-xs"
              title={`Activar Modo ${config.theme_mode === 'dark' ? 'Claro' : 'Oscuro'}`}
            >
              {config.theme_mode === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Modo Oscuro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-purple-600" />
                  <span>Modo Claro</span>
                </>
              )}
            </button>

            {/* Tasa Pill */}
            <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-50 to-amber-50 dark:from-gray-800 dark:to-gray-800 border border-purple-200 dark:border-gray-700 rounded-xl">
              <Coins className="w-4 h-4 text-amber-600" />
              <div className="text-xs">
                <span className="text-gray-500 dark:text-gray-400 text-[10px] font-semibold block uppercase">
                  Tasa {fuente.includes('manual') ? 'Manual' : 'BCV Oficial'}
                </span>
                <span className="font-black text-gray-900 dark:text-white text-sm">
                  Bs. {parseFloat(tasa || 45).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} / $
                </span>
              </div>

              <div className="flex items-center gap-1 border-l border-purple-200 dark:border-gray-700 pl-2 ml-1">
                <button
                  onClick={handleSyncBCV}
                  disabled={tasaCargando}
                  title="Sincronizar tasa oficial con BCV"
                  className="p-1 text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${tasaCargando ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    setNuevaTasaInput(tasa.toFixed(2));
                    setModalTasaOpen(true);
                  }}
                  title="Ajustar tasa manual del negocio"
                  className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-md transition-colors"
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
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">Ajustar Tasa de Cambio</h3>
                </div>
                <button
                  onClick={() => setModalTasaOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGuardarManual} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Nueva Tasa en Bolívares por Dólar (Bs/$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={nuevaTasaInput}
                    onChange={(e) => setNuevaTasaInput(e.target.value)}
                    placeholder="45.50"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl font-mono text-lg font-bold bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Motivo o Justificación del Ajuste
                  </label>
                  <input
                    type="text"
                    value={motivoTasaInput}
                    onChange={(e) => setMotivoTasaInput(e.target.value)}
                    placeholder="Cierre bancario vespertino"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalTasaOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm text-white rounded-xl font-bold shadow-md"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Guardar Tasa
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
