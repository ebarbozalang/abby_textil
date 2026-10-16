import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { HardHat, LogOut, Shirt } from 'lucide-react';

export default function TrabajadorLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header para Trabajador */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
              <HardHat size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 leading-tight">Portal de Producción</span>
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-medium">Operario</span>
              </div>
              <p className="text-xs text-gray-500">{user?.nombre}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
          >
            <LogOut size={14} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-100 bg-white">
        TEXTIL-APP — Registro y Consulta de Producción Personal
      </footer>
    </div>
  );
}
