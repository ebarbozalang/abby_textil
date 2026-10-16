import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
        <AlertCircle size={32} />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">404 — Página no encontrada</h1>
      <p className="text-gray-500 text-sm mt-2 max-w-sm">
        La ruta solicitada no existe o no tiene los permisos necesarios para visualizarla.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-colors"
      >
        <Home size={16} />
        <span>Volver al Inicio</span>
      </Link>
    </div>
  );
}
