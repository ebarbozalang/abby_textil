import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { HardHat, QrCode, DollarSign, Calendar, CheckCircle2, Clock, PackageCheck } from 'lucide-react';

export default function PortalTrabajador() {
  const { user } = useAuthStore();
  const [codigoRastreo, setCodigoRastreo] = useState('');
  const [registroExitoso, setRegistroExitoso] = useState(false);

  // Datos simulados para vista del trabajador (Semana 1)
  const stats = {
    hoyPiezas: 24,
    hoyGanancia: 72000,
    semanaPiezas: 110,
    semanaGanancia: 330000,
    mesPiezas: 420,
    mesGanancia: 1260000,
  };

  const handleRegistrarPieza = (e) => {
    e.preventDefault();
    if (!codigoRastreo.trim()) return;
    setRegistroExitoso(true);
    setCodigoRastreo('');
    setTimeout(() => setRegistroExitoso(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold text-amber-600 tracking-wider">Mi Producción</span>
          <h1 className="text-2xl font-black text-gray-900 mt-0.5">{user?.nombre}</h1>
          <p className="text-xs text-gray-500 mt-1">
            Modalidad: <span className="font-semibold text-gray-700">Pago por Producción</span>
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2.5 rounded-xl text-right">
          <p className="text-xs text-amber-700 font-medium">Ganancia Estimada del Mes</p>
          <p className="text-2xl font-black text-amber-600">${stats.mesGanancia.toLocaleString('es-CO')}</p>
        </div>
      </div>

      {/* Escáner / Registro Rápido por Código QR */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <QrCode className="text-blue-600" size={20} />
          <h2 className="text-base font-bold text-gray-900">Registrar Prenda Confeccionada</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Escanea el código QR de la etiqueta o digita manualmente el código de rastreo único de la prenda.
        </p>

        {registroExitoso && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>¡Prenda registrada con éxito en su nómina diaria!</span>
          </div>
        )}

        <form onSubmit={handleRegistrarPieza} className="flex gap-2">
          <input
            type="text"
            placeholder="Ej: RAS-PED1001-CAM-ROJ-M-01"
            value={codigoRastreo}
            onChange={(e) => setCodigoRastreo(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <PackageCheck size={18} />
            <span>Registrar</span>
          </button>
        </form>
      </div>

      {/* Métricas de Rendimiento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Hoy</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.hoyPiezas} prendas</p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            +${stats.hoyGanancia.toLocaleString('es-CO')} COP
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Esta Semana</span>
            <Calendar size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.semanaPiezas} prendas</p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            +${stats.semanaGanancia.toLocaleString('es-CO')} COP
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs mb-1">
            <span>Este Mes</span>
            <DollarSign size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.mesPiezas} prendas</p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            +${stats.mesGanancia.toLocaleString('es-CO')} COP
          </p>
        </div>
      </div>
    </div>
  );
}
