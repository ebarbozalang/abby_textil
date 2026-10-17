import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LogOut } from 'lucide-react';

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
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="AbbySoft Logo"
              className="w-10 h-10 rounded-full object-contain p-0.5 bg-[#7B0078] shadow-md shadow-[#7B0078]/20"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-gray-900 leading-tight">
                  Abby<span className="text-abby-700">Soft</span>
                </span>
                <span className="bg-abby-100 text-abby-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  Portal Operario
                </span>
              </div>
              <p className="text-xs text-gray-500">{user?.nombre}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl transition-colors"
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
        AbbySoft — Tu Visión, Nuestro Código. • Gestión y Trazabilidad Textil
      </footer>
    </div>
  );
}
