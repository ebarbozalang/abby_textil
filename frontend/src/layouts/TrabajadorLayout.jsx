import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useConfiguracionStore } from '../store/configuracionStore';
import { LogOut, Sun, Moon } from 'lucide-react';

export default function TrabajadorLayout() {
  const { user, logout } = useAuthStore();
  const { config, actualizarCampoLocal } = useConfiguracionStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleToggleTheme = () => {
    const nuevo = config.theme_mode === 'dark' ? 'light' : 'dark';
    actualizarCampoLocal('theme_mode', nuevo);
  };

  const primaryColor = config?.color_primario || '#7B0078';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col transition-colors">
      {/* Top Header para Trabajador */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 shadow-sm transition-colors">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={config?.logo_url || '/logo.png'}
              alt="Logo Empresa"
              className="w-10 h-10 rounded-full object-contain p-0.5 shadow-md"
              style={{ backgroundColor: primaryColor }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/logo.png';
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-gray-900 dark:text-white leading-tight">
                  {config?.nombre_empresa || 'AbbySoft Textil'}
                </span>
                <span
                  className="text-xs px-2.5 py-0.5 rounded-full font-bold text-white shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  Portal Operario
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.nombre}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleTheme}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Cambiar tema"
            >
              {config.theme_mode === 'dark' ? (
                <Sun size={18} className="text-amber-400" />
              ) : (
                <Moon size={18} className="text-purple-600" />
              )}
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl transition-colors"
            >
              <LogOut size={14} />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
        {config?.nombre_empresa || 'Inversiones AbbySoft Textil C.A.'} • {config?.slogan || 'Tu Visión, Nuestro Código.'}
      </footer>
    </div>
  );
}
